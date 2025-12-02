"""
Customer Service
Manages customer data and operations.
Currently uses mock data, but structured for easy database integration.
"""
from typing import List, Optional, Dict, Any
from app.schemas.customer import CustomerResponse


class CustomerService:
    """Service for managing customer data"""
    
    @staticmethod
    def get_mock_customers() -> List[Dict[str, Any]]:
        """
        Returns mock customer data for demo purposes.
        
        TODO: Replace with actual database queries when DB is ready:
        - Query from customers table
        - Filter by organization_id
        - Join with segment data if needed
        """
        return [
            {
                "id": "c1",
                "name": "Rahim Ahmed",
                "email": "nufsat@iut-dhaka.edu",
                "phone": "+8801712345678",
                "segment_id": "s1",
                "churn_score": 0.15,
                "custom_fields": {"purchase_amount": 50000, "last_purchase": "2025-11-15"}
            },
            {
                "id": "c2",
                "name": "Fatima Khan",
                "email": "fatima@example.com",
                "phone": "+8801812345679",
                "segment_id": "s1",
                "churn_score": 0.12,
                "custom_fields": {"purchase_amount": 75000, "last_purchase": "2025-11-20"}
            },
            {
                "id": "c3",
                "name": "Karim Hassan",
                "email": "karim@example.com",
                "phone": "+8801912345680",
                "segment_id": "s1",
                "churn_score": 0.18,
                "custom_fields": {"purchase_amount": 60000, "last_purchase": "2025-11-10"}
            },
            {
                "id": "c4",
                "name": "Nadia Rahman",
                "email": "nadia@example.com",
                "phone": "+8801612345681",
                "segment_id": "s2",
                "churn_score": 0.75,
                "custom_fields": {"purchase_amount": 25000, "last_purchase": "2025-09-05"}
            },
            {
                "id": "c5",
                "name": "Shakib Islam",
                "email": "shakib@example.com",
                "phone": "+8801512345682",
                "segment_id": "s2",
                "churn_score": 0.82,
                "custom_fields": {"purchase_amount": 15000, "last_purchase": "2025-08-20"}
            },
            {
                "id": "c6",
                "name": "Ayesha Begum",
                "email": "ayesha@example.com",
                "phone": "+8801412345683",
                "segment_id": "s2",
                "churn_score": 0.68,
                "custom_fields": {"purchase_amount": 30000, "last_purchase": "2025-09-15"}
            },
            {
                "id": "c7",
                "name": "Tanvir Hossain",
                "email": "tanvir@example.com",
                "phone": "+8801312345684",
                "segment_id": "s3",
                "churn_score": 0.45,
                "custom_fields": {"purchase_amount": 5000, "last_purchase": "2025-11-25"}
            },
            {
                "id": "c8",
                "name": "Sumaiya Akter",
                "email": "sumaiya@example.com",
                "phone": "+8801212345685",
                "segment_id": "s3",
                "churn_score": 0.50,
                "custom_fields": {"purchase_amount": 8000, "last_purchase": "2025-11-28"}
            },
            {
                "id": "c9",
                "name": "Rifat Chowdhury",
                "email": "rifat@example.com",
                "phone": "+8801112345686",
                "segment_id": "s3",
                "churn_score": 0.40,
                "custom_fields": {"purchase_amount": 3000, "last_purchase": "2025-11-30"}
            },
            {
                "id": "c10",
                "name": "Maliha Tabassum",
                "email": "maliha@example.com",
                "phone": "+8801012345687",
                "segment_id": "s3",
                "churn_score": 0.42,
                "custom_fields": {"purchase_amount": 6000, "last_purchase": "2025-11-27"}
            }
        ]
    
    @staticmethod
    async def get_all_customers(organization_id: int) -> List[CustomerResponse]:
        """
        Get all customers for an organization.
        
        Args:
            organization_id: The organization ID
            
        Returns:
            List of customers
            
        TODO: Replace with DB query:
            customers = await db.query(Customer).filter(
                Customer.organization_id == organization_id
            ).all()
        """
        customers = CustomerService.get_mock_customers()
        return [CustomerResponse(**c, organization_id=organization_id) for c in customers]
    
    @staticmethod
    async def get_customer_by_id(customer_id: str, organization_id: int) -> Optional[CustomerResponse]:
        """
        Get a single customer by ID.
        
        Args:
            customer_id: Customer ID
            organization_id: Organization ID
            
        Returns:
            Customer or None
            
        TODO: Replace with DB query:
            customer = await db.query(Customer).filter(
                Customer.id == customer_id,
                Customer.organization_id == organization_id
            ).first()
        """
        customers = CustomerService.get_mock_customers()
        customer = next((c for c in customers if c["id"] == customer_id), None)
        if customer:
            return CustomerResponse(**customer, organization_id=organization_id)
        return None
    
    @staticmethod
    async def get_customers_by_ids(customer_ids: List[str], organization_id: int) -> List[CustomerResponse]:
        """
        Get multiple customers by their IDs.
        
        Args:
            customer_ids: List of customer IDs
            organization_id: Organization ID
            
        Returns:
            List of customers
            
        TODO: Replace with DB query:
            customers = await db.query(Customer).filter(
                Customer.id.in_(customer_ids),
                Customer.organization_id == organization_id
            ).all()
        """
        customers = CustomerService.get_mock_customers()
        filtered = [c for c in customers if c["id"] in customer_ids]
        return [CustomerResponse(**c, organization_id=organization_id) for c in filtered]
    
    @staticmethod
    async def get_customers_by_segment(segment_id: str, organization_id: int) -> List[CustomerResponse]:
        """
        Get all customers in a specific segment.
        
        Args:
            segment_id: Segment ID
            organization_id: Organization ID
            
        Returns:
            List of customers in the segment
            
        TODO: Replace with DB query:
            customers = await db.query(Customer).filter(
                Customer.segment_id == segment_id,
                Customer.organization_id == organization_id
            ).all()
        """
        customers = CustomerService.get_mock_customers()
        filtered = [c for c in customers if c.get("segment_id") == segment_id]
        return [CustomerResponse(**c, organization_id=organization_id) for c in filtered]
