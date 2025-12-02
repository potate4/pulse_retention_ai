from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.db.base import Base  # Import your models here
from app.core.config import settings

# Import all models here so Alembic can detect them
from app.db.models.user import User  # noqa
from app.db.models.organization import Organization  # noqa
from app.db.models.customer import Customer  # noqa
from app.db.models.transaction import Transaction  # noqa
from app.db.models.customer_feature import CustomerFeature  # noqa
from app.db.models.churn_prediction import ChurnPrediction  # noqa
from app.db.models.model_metadata import ModelMetadata  # noqa
from app.db.models.data_processing_status import DataProcessingStatus  # noqa
from app.db.models.dataset import Dataset  # noqa
from app.db.models.prediction_batch import PredictionBatch, CustomerPrediction  # noqa

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata  # Set the target metadata to your Base metadata

def run_migrations_offline() -> None:
    # url = config.get_main_option("sqlalchemy.url")
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section)
    configuration['sqlalchemy.url'] = settings.DATABASE_URL
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()