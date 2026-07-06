"""Add estado (activo/archivado) to products

Revision ID: c7e51a9f3d02
Revises: a1f3c9d27b40
Create Date: 2026-07-05 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7e51a9f3d02'
down_revision: Union[str, Sequence[str], None] = 'a1f3c9d27b40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('products', sa.Column('estado', sa.String(length=20), nullable=False, server_default='activo'))
    op.create_index(op.f('ix_products_estado'), 'products', ['estado'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_products_estado'), table_name='products')
    op.drop_column('products', 'estado')
