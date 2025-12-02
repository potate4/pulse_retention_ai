from app.db.base_class import Base  # Import the Base class

# Import all models here so Alembic can detect them
from app.db.models.user import User  # noqa
from app.db.models.organization import Organization  # noqa
from app.db.models.customer import Customer  # noqa
from app.db.models.transaction import Transaction  # noqa
from app.db.models.customer_feature import CustomerFeature  # noqa
from app.db.models.churn_prediction import ChurnPrediction  # noqa
from app.db.models.model_metadata import ModelMetadata  # noqa
from app.db.models.data_processing_status import DataProcessingStatus  # noqa
from app.db.models.dataset import Dataset  # noqa - NEW for Churn V2
