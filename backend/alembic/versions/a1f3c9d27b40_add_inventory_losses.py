"""Add inventory_losses (mermas de inventario)

Revision ID: a1f3c9d27b40
Revises: e28dccca1b05
Create Date: 2026-07-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1f3c9d27b40'
down_revision: Union[str, Sequence[str], None] = 'e28dccca1b05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('inventory_losses',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('producto_id', sa.UUID(), nullable=False),
    sa.Column('cantidad', sa.Integer(), nullable=False, server_default='1'),
    sa.Column('motivo', sa.String(length=200), nullable=True),
    sa.Column('costo_historico', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('fecha_hora', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    sa.ForeignKeyConstraint(['producto_id'], ['products.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('inventory_losses')
