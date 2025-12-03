"""
Customer Segmentation Engine
Core logic for assigning customers to segments based on RFM and churn predictions
"""
from sqlalchemy import and_
import pandas as pd
import uuid
import io
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import UUID

from app.db.models.customer_feature import CustomerFeature
from app.db.models.customer_segment import CustomerSegment
from app.db.models.churn_prediction import ChurnPrediction
from app.db.models.prediction_batch import CustomerPrediction
from app.db.models.dataset import Dataset
from app.services.storage import download_from_supabase
from .rules import assign_segment, get_segment_metadata
from .utils import (
    categorize_rfm_score,
    categorize_churn_probability,
    calculate_segment_score,
    get_rfm_category_dict
)


def segment_customer(
    customer_id: UUID,
    churn_probability: float,
    db: Session
) -> Dict[str, Any]:
    """
    Segment a single customer based on RFM features and churn probability.

    Args:
        customer_id: Customer UUID
        churn_probability: Churn probability (0.0 to 1.0)
        db: Database session

    Returns:
        Dictionary with segment, score, rfm_category, risk_level

    Raises:
        ValueError: If customer features not found
    """
    # Get customer features (RFM scores)
    feature = db.query(CustomerFeature).filter(
        CustomerFeature.customer_id == customer_id
    ).first()

    if not feature:
        raise ValueError(f"No features found for customer {customer_id}")

    # Get customer for organization_id
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise ValueError(f"Customer {customer_id} not found")

    # Categorize RFM scores
    R = categorize_rfm_score(float(feature.recency_score or 0))
    F = categorize_rfm_score(float(feature.frequency_score or 0))
    M = categorize_rfm_score(float(feature.monetary_score or 0))
    E = categorize_rfm_score(float(feature.engagement_score or 0))

    # Categorize churn risk
    churn_risk = categorize_churn_probability(churn_probability)

    # Assign segment
    segment = assign_segment(R, F, M, E, churn_risk)

    # Calculate composite score
    segment_score = calculate_segment_score(
        float(feature.recency_score or 0),
        float(feature.frequency_score or 0),
        float(feature.monetary_score or 0),
        float(feature.engagement_score or 0),
        churn_probability
    )

    # Get RFM category dict
    rfm_category = get_rfm_category_dict(
        float(feature.recency_score or 0),
        float(feature.frequency_score or 0),
        float(feature.monetary_score or 0),
        float(feature.engagement_score or 0)
    )

    # Get segment metadata
    metadata = get_segment_metadata(segment)

    return {
        'customer_id': str(customer_id),
        'organization_id': str(customer.organization_id),
        'segment': segment,
        'segment_score': segment_score,
        'rfm_category': rfm_category,
        'churn_risk_level': churn_risk,
        'churn_probability': churn_probability,
        'extra_data': metadata
    }


def batch_segment_customers(
    organization_id: UUID,
    churn_predictions_csv: str,
    db: Session
) -> Dict[str, Any]:
    """
    Batch segment all customers from CSV churn predictions.

    Args:
        organization_id: Organization UUID
        churn_predictions_csv: Path to CSV file with customer_id and churn_score
        db: Database session

    Returns:
        Status dictionary with counts and errors
    """
    try:
        # Load churn predictions CSV
        df = pd.read_csv(churn_predictions_csv)

        if 'customer_id' not in df.columns or 'churn_score' not in df.columns:
            raise ValueError("CSV must have 'customer_id' and 'churn_score' columns")

        total_customers = len(df)
        segmented = 0
        errors = []

        print(f"Processing {total_customers} customers for segmentation...")

        for idx, row in df.iterrows():
            try:
                external_customer_id = row['customer_id']
                churn_probability = float(row['churn_score'])

                # Find customer by external_customer_id
                customer = db.query(Customer).filter(
                    Customer.external_customer_id == external_customer_id,
                    Customer.organization_id == organization_id
                ).first()

                if not customer:
                    errors.append(f"Customer {external_customer_id} not found in organization")
                    continue

                # Segment customer
                segment_data = segment_customer(customer.id, churn_probability, db)

                # Check if segment already exists
                existing_segment = db.query(CustomerSegment).filter(
                    CustomerSegment.customer_id == customer.id
                ).first()

                if existing_segment:
                    # Update existing
                    existing_segment.segment = segment_data['segment']
                    existing_segment.segment_score = segment_data['segment_score']
                    existing_segment.rfm_category = segment_data['rfm_category']
                    existing_segment.churn_risk_level = segment_data['churn_risk_level']
                    existing_segment.assigned_at = datetime.utcnow()
                    existing_segment.extra_data = segment_data['extra_data']
                else:
                    # Create new
                    new_segment = CustomerSegment(
                        customer_id=customer.id,
                        organization_id=organization_id,
                        segment=segment_data['segment'],
                        segment_score=segment_data['segment_score'],
                        rfm_category=segment_data['rfm_category'],
                        churn_risk_level=segment_data['churn_risk_level'],
                        extra_data=segment_data['extra_data']
                    )
                    db.add(new_segment)

                segmented += 1

                # Commit every 100 records
                if segmented % 100 == 0:
                    db.commit()
                    print(f"  Segmented {segmented}/{total_customers} customers...")

            except Exception as e:
                errors.append(f"Error segmenting customer {row.get('customer_id')}: {str(e)}")
                continue

        # Final commit
        db.commit()

        print(f"Completed: {segmented}/{total_customers} customers segmented")

        return {
            'success': True,
            'total_customers': total_customers,
            'segmented': segmented,
            'errors': errors
        }

    except Exception as e:
        db.rollback()
        raise Exception(f"Error in batch segmentation: {str(e)}")


def batch_segment_customers_optimized(
    organization_id: UUID,
    churn_predictions_csv: str,
    db: Session
) -> Dict[str, Any]:
    """
    Optimized batch segmentation with minimal database queries.
    
    Args:
        organization_id: Organization UUID
        churn_predictions_csv: Path to CSV file with customer_id and churn_score
        db: Database session
    
    Returns:
        Status dictionary with counts and errors
    """
    try:
        # Load churn predictions CSV
        df = pd.read_csv(churn_predictions_csv)
        
        if 'customer_id' not in df.columns or 'churn_score' not in df.columns:
            raise ValueError("CSV must have 'customer_id' and 'churn_score' columns")
        
        total_customers = len(df)
        print(f"Processing {total_customers} customers for segmentation...")
        
        # Create lookup dictionary for churn scores
        churn_lookup = dict(zip(df['customer_id'], df['churn_score']))
        external_ids = df['customer_id'].tolist()
        
        # BATCH QUERY 1: Get all customers with features in ONE query
        customers_with_features = db.query(
            Customer,
            CustomerFeature
        ).join(
            CustomerFeature,
            Customer.id == CustomerFeature.customer_id
        ).filter(
            and_(
                Customer.external_customer_id.in_(external_ids),
                Customer.organization_id == organization_id
            )
        ).all()
        
        print(f"Found {len(customers_with_features)} customers with features")
        
        # Create lookup dictionaries
        customer_lookup = {}
        feature_lookup = {}
        for customer, feature in customers_with_features:
            customer_lookup[customer.external_customer_id] = customer
            feature_lookup[customer.id] = feature
        
        # BATCH QUERY 2: Get all existing segments in ONE query
        customer_ids = [c.id for c in customer_lookup.values()]
        existing_segments = db.query(CustomerSegment).filter(
            CustomerSegment.customer_id.in_(customer_ids)
        ).all()
        
        existing_segments_lookup = {seg.customer_id: seg for seg in existing_segments}
        
        # Process all customers in memory
        segmented = 0
        errors = []
        segments_to_add = []
        segments_to_update = []
        
        for external_id, churn_score in churn_lookup.items():
            try:
                # Validate churn score
                churn_probability = float(churn_score)
                if not 0.0 <= churn_probability <= 1.0:
                    errors.append(f"Invalid churn score {churn_score} for customer {external_id}")
                    continue
                
                # Check if customer exists
                if external_id not in customer_lookup:
                    errors.append(f"Customer {external_id} not found in organization")
                    continue
                
                customer = customer_lookup[external_id]
                feature = feature_lookup.get(customer.id)
                
                if not feature:
                    errors.append(f"No features found for customer {external_id}")
                    continue
                
                # Perform segmentation (all in-memory calculations)
                segment_data = segment_customer_inmemory(
                    customer_id=customer.id,
                    feature=feature,
                    churn_probability=churn_probability,
                    organization_id=organization_id
                )
                
                # Check if segment exists
                existing_segment = existing_segments_lookup.get(customer.id)
                
                if existing_segment:
                    # Update existing
                    existing_segment.segment = segment_data['segment']
                    existing_segment.segment_score = segment_data['segment_score']
                    existing_segment.rfm_category = segment_data['rfm_category']
                    existing_segment.churn_risk_level = segment_data['churn_risk_level']
                    existing_segment.assigned_at = datetime.utcnow()
                    existing_segment.extra_data = segment_data['extra_data']
                    segments_to_update.append(existing_segment)
                else:
                    # Create new
                    new_segment = CustomerSegment(
                        customer_id=customer.id,
                        organization_id=organization_id,
                        segment=segment_data['segment'],
                        segment_score=segment_data['segment_score'],
                        rfm_category=segment_data['rfm_category'],
                        churn_risk_level=segment_data['churn_risk_level'],
                        extra_data=segment_data['extra_data']
                    )
                    segments_to_add.append(new_segment)
                
                segmented += 1
                
                # Progress indicator
                if segmented % 1000 == 0:
                    print(f"  Processed {segmented}/{total_customers} customers...")
                
            except Exception as e:
                errors.append(f"Error segmenting customer {external_id}: {str(e)}")
                continue
        
        # BATCH INSERT/UPDATE: Add all new segments at once
        if segments_to_add:
            db.bulk_save_objects(segments_to_add)
            print(f"  Adding {len(segments_to_add)} new segments...")
        
        # Commit all changes in ONE transaction
        db.commit()
        print(f"Completed: {segmented}/{total_customers} customers segmented")
        
        return {
            'success': True,
            'total_customers': total_customers,
            'segmented': segmented,
            'new_segments': len(segments_to_add),
            'updated_segments': len(segments_to_update),
            'errors': errors
        }
    
    except Exception as e:
        db.rollback()
        raise Exception(f"Error in batch segmentation: {str(e)}")


def segment_customer_inmemory(
    customer_id: UUID,
    feature: CustomerFeature,
    churn_probability: float,
    organization_id: UUID
) -> Dict[str, Any]:
    """
    Segment customer using pre-loaded feature data (no DB queries).
    
    Args:
        customer_id: Customer UUID
        feature: CustomerFeature object (already loaded)
        churn_probability: Churn probability (0.0 to 1.0)
        organization_id: Organization UUID
    
    Returns:
        Dictionary with segment, score, rfm_category, risk_level
    """
    # Categorize RFM scores
    R = categorize_rfm_score(float(feature.recency_score or 0))
    F = categorize_rfm_score(float(feature.frequency_score or 0))
    M = categorize_rfm_score(float(feature.monetary_score or 0))
    E = categorize_rfm_score(float(feature.engagement_score or 0))
    
    # Categorize churn risk
    churn_risk = categorize_churn_probability(churn_probability)
    
    # Assign segment
    segment = assign_segment(R, F, M, E, churn_risk)
    
    # Calculate composite score
    segment_score = calculate_segment_score(
        float(feature.recency_score or 0),
        float(feature.frequency_score or 0),
        float(feature.monetary_score or 0),
        float(feature.engagement_score or 0),
        churn_probability
    )
    
    # Get RFM category dict
    rfm_category = get_rfm_category_dict(
        float(feature.recency_score or 0),
        float(feature.frequency_score or 0),
        float(feature.monetary_score or 0),
        float(feature.engagement_score or 0)
    )
    
    # Get segment metadata
    metadata = get_segment_metadata(segment)
    
    return {
        'customer_id': str(customer_id),
        'organization_id': str(organization_id),
        'segment': segment,
        'segment_score': segment_score,
        'rfm_category': rfm_category,
        'churn_risk_level': churn_risk,
        'churn_probability': churn_probability,
        'extra_data': metadata
    }


def get_segment_distribution(organization_id: UUID, db: Session) -> Dict[str, Any]:
    """
    Get segment distribution for an organization.

    Args:
        organization_id: Organization UUID
        db: Database session

    Returns:
        Dictionary with segment counts and percentages
    """
    # Get all segments for organization
    segments = db.query(CustomerSegment).filter(
        CustomerSegment.organization_id == organization_id
    ).all()

    if not segments:
        return {
            'total_customers': 0,
            'segments': {}
        }

    # Count by segment
    segment_counts = {}
    for seg in segments:
        segment_name = seg.segment
        segment_counts[segment_name] = segment_counts.get(segment_name, 0) + 1

    total = len(segments)

    # Calculate percentages
    segment_distribution = {}
    for segment_name, count in segment_counts.items():
        segment_distribution[segment_name] = {
            'count': count,
            'percentage': round((count / total) * 100, 2),
            'extra_data': get_segment_metadata(segment_name)
        }

    return {
        'total_customers': total,
        'segments': segment_distribution
    }


def get_customer_segment(customer_id: UUID, db: Session) -> Optional[Dict[str, Any]]:
    """
    Get segment for a specific customer.

    Args:
        customer_id: Customer UUID
        db: Database session

    Returns:
        Segment dictionary or None if not found
    """
    segment = db.query(CustomerSegment).filter(
        CustomerSegment.customer_id == customer_id
    ).first()

    if not segment:
        return None

    return {
        'customer_id': str(segment.customer_id),
        'organization_id': str(segment.organization_id),
        'segment': segment.segment,
        'segment_score': float(segment.segment_score),
        'rfm_category': segment.rfm_category,
        'churn_risk_level': segment.churn_risk_level,
        'assigned_at': segment.assigned_at.isoformat() if segment.assigned_at else None,
        'extra_data': segment.extra_data
    }


def batch_segment_customers_from_db(
    organization_id: UUID,
    batch_id: Optional[UUID],
    db: Session
) -> Dict[str, Any]:
    """
    Batch segment customers using predictions from CustomerPrediction table and RFM features from Dataset CSV.

    New approach:
    1. Get predictions from CustomerPrediction table (external_customer_id, churn_probability)
    2. Download RFM features CSV from Dataset table (dataset_type='features')
    3. Get minimal Customer UUID mapping (external_customer_id -> customer_id)
    4. Segment using RFM from CSV + churn probability

    Args:
        organization_id: Organization UUID
        batch_id: Optional batch ID to segment specific batch, or None for all predictions
        db: Database session

    Returns:
        Status dictionary with counts and errors
    """
    try:
        # STEP 1: Get predictions from CustomerPrediction table
        query = db.query(CustomerPrediction).filter(
            CustomerPrediction.organization_id == organization_id
        )

        if batch_id:
            query = query.filter(CustomerPrediction.batch_id == batch_id)

        customer_predictions = query.all()

        if not customer_predictions:
            return {
                'success': False,
                'total_customers': 0,
                'segmented': 0,
                'errors': ['No predictions found for this organization']
            }

        total_customers = len(customer_predictions)
        print(f"Processing {total_customers} customers for segmentation from database...")

        # Create lookup dictionary for churn scores
        churn_lookup = {
            pred.external_customer_id: float(pred.churn_probability)
            for pred in customer_predictions
        }
        external_ids = list(churn_lookup.keys())

        # STEP 2: Get RFM features dataset (latest features CSV for this org)
        features_dataset = db.query(Dataset).filter(
            Dataset.organization_id == organization_id,
            Dataset.dataset_type == 'features',
            Dataset.status == 'ready'
        ).order_by(Dataset.uploaded_at.desc()).first()

        if not features_dataset:
            return {
                'success': False,
                'total_customers': total_customers,
                'segmented': 0,
                'errors': ['No RFM features dataset found for this organization. Please process features first.']
            }

        print(f"Downloading RFM features from: {features_dataset.file_url}")

        # Download and parse RFM CSV from Supabase
        try:
            rfm_csv_bytes = download_from_supabase(
                features_dataset.bucket_name,
                features_dataset.file_path
            )
            rfm_df = pd.read_csv(io.BytesIO(rfm_csv_bytes))
            print(f"Loaded {len(rfm_df)} RFM records from CSV")
        except Exception as e:
            return {
                'success': False,
                'total_customers': total_customers,
                'segmented': 0,
                'errors': [f'Error downloading RFM features CSV: {str(e)}']
            }

        # Validate RFM CSV columns
        required_rfm_cols = ['customer_id', 'recency_score', 'frequency_score', 'monetary_score', 'engagement_score']
        missing_cols = [col for col in required_rfm_cols if col not in rfm_df.columns]
        if missing_cols:
            return {
                'success': False,
                'total_customers': total_customers,
                'segmented': 0,
                'errors': [f'RFM CSV missing required columns: {missing_cols}']
            }

        # Create RFM lookup dictionary by customer_id
        rfm_lookup = {}
        for _, row in rfm_df.iterrows():
            rfm_lookup[str(row['customer_id'])] = {
                'recency_score': float(row['recency_score']),
                'frequency_score': float(row['frequency_score']),
                'monetary_score': float(row['monetary_score']),
                'engagement_score': float(row['engagement_score'])
            }

        print(f"RFM lookup created for {len(rfm_lookup)} customers")

        # STEP 3: Use external_customer_ids directly (no Customer table lookup needed)
        # Map external_customer_id to itself for consistency with existing code structure
        customer_id_map = {ext_id: ext_id for ext_id in external_ids}

        print(f"Processing {len(customer_id_map)} customers")

        # STEP 4: Get existing segments and clean up duplicates
        existing_segments = db.query(CustomerSegment).filter(
            CustomerSegment.customer_id.in_(external_ids),
            CustomerSegment.organization_id == organization_id
        ).all()

        # Build lookup and handle duplicates by keeping only the most recent
        existing_segments_lookup = {}
        duplicate_segments = []

        for seg in existing_segments:
            if seg.customer_id in existing_segments_lookup:
                # Found a duplicate - keep the most recent one
                existing_seg = existing_segments_lookup[seg.customer_id]
                if seg.assigned_at > existing_seg.assigned_at:
                    # This segment is newer, remove the old one
                    duplicate_segments.append(existing_seg)
                    existing_segments_lookup[seg.customer_id] = seg
                else:
                    # Keep the existing one, mark this for removal
                    duplicate_segments.append(seg)
            else:
                existing_segments_lookup[seg.customer_id] = seg

        # Delete duplicate segments if found
        if duplicate_segments:
            print(f"Found {len(duplicate_segments)} duplicate segments, cleaning up...")
            try:
                for dup_seg in duplicate_segments:
                    db.delete(dup_seg)
                db.commit()
                print(f"Removed {len(duplicate_segments)} duplicate segments")
            except Exception as cleanup_error:
                print(f"Warning: Could not clean up duplicates: {str(cleanup_error)}")
                db.rollback()
                # Rebuild the lookup after rollback
                existing_segments = db.query(CustomerSegment).filter(
                    CustomerSegment.customer_id.in_(customer_uuids)
                ).all()
                existing_segments_lookup = {seg.customer_id: seg for seg in existing_segments}

        # STEP 5: Process all customers and create segments
        segmented = 0
        errors = []
        segments_to_add = []
        segments_to_update = []
        processed_customer_ids = set()  # Track processed customers to prevent duplicates in this batch

        print(f"Starting segmentation loop for {len(churn_lookup)} customers...")
        print(f"  Existing segments found: {len(existing_segments_lookup)}")

        for external_id, churn_probability in churn_lookup.items():
            try:
                # Skip if already processed in this batch (safeguard against duplicate data)
                if external_id in processed_customer_ids:
                    continue

                # Validate churn score
                if not 0.0 <= churn_probability <= 1.0:
                    errors.append(f"Invalid churn score {churn_probability} for customer {external_id}")
                    continue

                # Check if RFM features exist for this customer
                if external_id not in rfm_lookup:
                    errors.append(f"No RFM features found for customer {external_id} in features CSV")
                    continue

                rfm_features = rfm_lookup[external_id]

                # Categorize RFM scores
                R = categorize_rfm_score(rfm_features['recency_score'])
                F = categorize_rfm_score(rfm_features['frequency_score'])
                M = categorize_rfm_score(rfm_features['monetary_score'])
                E = categorize_rfm_score(rfm_features['engagement_score'])

                # Categorize churn risk
                churn_risk = categorize_churn_probability(churn_probability)

                # Assign segment
                segment = assign_segment(R, F, M, E, churn_risk)

                # Calculate composite score
                segment_score = calculate_segment_score(
                    rfm_features['recency_score'],
                    rfm_features['frequency_score'],
                    rfm_features['monetary_score'],
                    rfm_features['engagement_score'],
                    churn_probability
                )

                # Get RFM category dict
                rfm_category = get_rfm_category_dict(
                    rfm_features['recency_score'],
                    rfm_features['frequency_score'],
                    rfm_features['monetary_score'],
                    rfm_features['engagement_score']
                )

                # Get segment metadata
                metadata = get_segment_metadata(segment)

                # Check if segment exists (using external_customer_id directly)
                existing_segment = existing_segments_lookup.get(external_id)

                if existing_segment:
                    # Prepare update data as dictionary (for bulk_update_mappings)
                    update_data = {
                        'id': existing_segment.id,
                        'segment': segment,
                        'segment_score': segment_score,
                        'rfm_category': rfm_category,
                        'churn_risk_level': churn_risk,
                        'assigned_at': datetime.utcnow(),
                        'extra_data': metadata
                    }
                    segments_to_update.append(update_data)
                else:
                    # Create new segment object (using external_customer_id directly)
                    new_segment = CustomerSegment(
                        customer_id=external_id,  # Using external_customer_id directly as string
                        organization_id=organization_id,
                        segment=segment,
                        segment_score=segment_score,
                        rfm_category=rfm_category,
                        churn_risk_level=churn_risk,
                        extra_data=metadata
                    )
                    segments_to_add.append(new_segment)

                # Mark customer as processed
                processed_customer_ids.add(external_id)
                segmented += 1

                # Progress indicator
                if segmented % 1000 == 0:
                    print(f"  Processed {segmented}/{total_customers} customers...")

            except Exception as e:
                errors.append(f"Error segmenting customer {external_id}: {str(e)}")
                continue

        # STEP 6: Batch insert/update segments
        print(f"\nPreparing to commit:")
        print(f"  Total processed: {segmented}")
        print(f"  Segments to add: {len(segments_to_add)}")
        print(f"  Segments to update: {len(segments_to_update)}")
        print(f"  Errors so far: {len(errors)}")

        try:
            # First, bulk update existing segments in batches (commit each batch separately)
            if segments_to_update:
                print(f"  Bulk updating {len(segments_to_update)} existing segments in batches...")
                batch_size = 500
                total_batches = (len(segments_to_update) + batch_size - 1) // batch_size
                for i in range(0, len(segments_to_update), batch_size):
                    batch = segments_to_update[i:i + batch_size]
                    db.bulk_update_mappings(CustomerSegment, batch)
                    db.commit()  # Commit each batch separately
                    print(f"    Updated and committed batch {i//batch_size + 1}/{total_batches} ({len(batch)} segments)")
                print(f"  All {len(segments_to_update)} segments updated...")

            # Then, bulk insert new segments in batches (commit each batch separately)
            if segments_to_add:
                print(f"  Bulk inserting {len(segments_to_add)} new segments in batches...")
                batch_size = 500
                total_batches = (len(segments_to_add) + batch_size - 1) // batch_size
                for i in range(0, len(segments_to_add), batch_size):
                    batch = segments_to_add[i:i + batch_size]
                    db.bulk_save_objects(batch)
                    db.commit()  # Commit each batch separately
                    print(f"    Inserted and committed batch {i//batch_size + 1}/{total_batches} ({len(batch)} segments)")
                print(f"  All {len(segments_to_add)} segments added...")

            print(f"Completed: {segmented}/{total_customers} customers segmented")
        except Exception as commit_error:
            print(f"Bulk commit failed: {str(commit_error)}")
            print(f"  Segments to add: {len(segments_to_add)}")
            print(f"  Segments to update: {len(segments_to_update)}")
            db.rollback()

            # Try inserting segments one by one to identify problematic records
            print("Attempting individual segment insertion...")
            successful_inserts = 0
            failed_inserts = 0

            try:
                # Re-apply updates one by one using update statement
                for seg_data in segments_to_update:
                    try:
                        db.query(CustomerSegment).filter(
                            CustomerSegment.id == seg_data['id']
                        ).update(seg_data)
                        db.commit()
                        successful_inserts += 1
                    except Exception as e:
                        db.rollback()
                        failed_inserts += 1
                        errors.append(f"Failed to update segment {seg_data['id']}: {str(e)}")

                # Insert new segments one by one
                for seg in segments_to_add:
                    try:
                        db.add(seg)
                        db.commit()
                        successful_inserts += 1
                    except Exception as e:
                        db.rollback()
                        failed_inserts += 1
                        errors.append(f"Failed to add segment for customer {seg.customer_id}: {str(e)}")

                print(f"Individual insertion complete: {successful_inserts} successful, {failed_inserts} failed")

                if successful_inserts > 0:
                    return {
                        'success': True,
                        'total_customers': total_customers,
                        'segmented': successful_inserts,
                        'new_segments': len([s for s in segments_to_add]),
                        'updated_segments': len([s for s in segments_to_update]),
                        'errors': errors if errors else None
                    }
            except Exception as retry_error:
                print(f"Individual insertion also failed: {str(retry_error)}")
                errors.append(f"Retry error: {str(retry_error)}")

            return {
                'success': False,
                'total_customers': total_customers,
                'segmented': 0,
                'new_segments': 0,
                'updated_segments': 0,
                'errors': errors
            }

        return {
            'success': True,
            'total_customers': total_customers,
            'segmented': segmented,
            'new_segments': len(segments_to_add),
            'updated_segments': len(segments_to_update),
            'errors': errors if errors else None
        }

    except Exception as e:
        print(f"Fatal error in batch segmentation: {str(e)}")
        db.rollback()
        return {
            'success': False,
            'total_customers': 0,
            'segmented': 0,
            'new_segments': 0,
            'updated_segments': 0,
            'errors': [f"Fatal error: {str(e)}"]
        }
