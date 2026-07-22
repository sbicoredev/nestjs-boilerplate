# Define the migration directory and DataSource file
MIGRATION_DIR := database/migrations
DATA_SOURCE := src/core/database/data-source.ts

# Generate a new empty migration, prompting for a name
migration-new:
	@read -p "Enter migration name e.g. <create-user>: " name; \
	pnpm run migration:create $(MIGRATION_DIR)/$$name 

# Automatically generate migration files based on the changes you made to the entities,
migration-gen:
	@read -p "Enter migration name e.g. <create-user>: " name; \
	pnpm run migration:generate $(MIGRATION_DIR)/$$name 

# Apply migrations
migration-apply:
	pnpm run migration:run

# Revert the last applied migration
migration-revert:
	pnpm run migration:revert

# Show the applied migration
migration-show:
	pnpm run migration:show
