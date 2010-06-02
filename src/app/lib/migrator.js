/**
 * Class Migrator is based upon Max Aller's <nanodeath@gmail.com>
 * Migrator class located here:
 * http://gist.github.com/raw/324073/208db3dcf2a3df43e3ab6c3db758d14f3edb59d3/Migrator.js
 *
 * How to article it stemed from:
 * http://blog.maxaller.name/2010/03/html5-web-sql-database-intro-to-versioning-and-migrations/comment-page-1/
 *
 * The class is use to migrate a HTML5 database from one version
 * to the next seamlessly and without a lot of headache.
 *
 * @param db {Database} The HTML5 database the migration is to be performed on.
 */
function Migrator(db) {
	// Events to be broadcast when the database migration is in progress
	var startMigration = Mojo.Event.make(Migrator.StartMigration, {});
	var migrationProgress = Mojo.Event.make(Migrator.Migration, {version: 0});
	var migrationError = Mojo.Event.make(Migrator.MigrationError, {error: {}});
	var finishMigration = Mojo.Event.make(Migrator.FinishMigration, {});

	/**
	 *@private
	 * This is the array of schemas that can be transitioned.
	 */
	var migrations = [];

	/**
	 * Add new migration versions.
	 * @param number {Number} The version number that this schema will transition to upon applying this migration.
	 * @param func {Function} The SQL transaction to be peformed to transation to the version specified.
	 * @returns Null
	 */
	this.migration = function(number, func){
		migrations[number] = func;
	};

	/**
	 * @private
	 * Method that actually performs the migration from
	 * one version to the next.
	 * @param number {Number} The version number the database will be migrated to.
	 */
	var doMigration = function(number){
		if(migrations[number]){
			// Perform the database change
			db.changeVersion(
				db.version,
				String(number),
				function(t) {
					migrations[number](t);
				},
				function(err) {
					Mojo.Log.error("%s", err);
					// Send an error event
					Object.extend(migrationError.error, err);
					Mojo.Controller.stageController.sendEventToCommanders(migrationError);
				},
				function() {
					// Send event that a migration to version number has happened
					migrationProgress.version = number;
					Mojo.Controller.stageController.sendEventToCommanders(migrationProgress);
					// Go to the next migration
					doMigration(number+1);
				}
			);
		} else {
			// Only comes here if no more migrations are going to happen
			Mojo.Controller.stageController.sendEventToCommanders(finishMigration);
		}
	};

	/**
	 * Start performing the database migrations.
	 */
	this.doIt = function() {
		var initialVersion = parseInt(db.version) || 0;
		// Send the event that the database is begining it's progress
		Mojo.Controller.stageController.sendEventToCommanders(startMigration);
		try {
			doMigration(initialVersion+1);
		} catch(e) {
			Mojo.Log.error("%s", e);
			// Send an error event
			Object.extend(migrationError.error, err);
			Mojo.Controller.stageController.sendEventToCommanders(migrationError);
		}
	}
};

Migrator.StartMigration = 'onMigrationStart';
Migrator.Migration = 'onMigrationProgress';
Migrator.MigrationError = 'onMigrationError';
Migrator.FinishMigration = 'onMigrationEnd';
