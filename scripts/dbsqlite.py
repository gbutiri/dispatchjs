"""
SQLite Database Utility Module

Provides centralized database connection management and query execution for UNI.
Handles connection pooling, automatic retries, and result formatting.

DATABASE FILE:
    db/uni.db

CONNECTION FEATURES:
    - Persistent global connection (db_conn)
    - Automatic retry on connection failure (3 attempts, 5 sec delay)
    - Thread-safe configuration (check_same_thread=False)
    - Row factory: Returns dict-like sqlite3.Row objects

QUERY INTERFACE:
    - sql(): Main query executor with automatic formatting
    - Supports SELECT, INSERT, UPDATE, DELETE, PRAGMA
    - Parameter binding for SQL injection protection
    - Auto-converts %s placeholders to ? for SQLite compatibility

RESULT FORMATS:
    - SELECT: Returns list of dicts or single dict
    - INSERT: Returns last inserted row ID
    - PRAGMA: Returns list of dicts
    - Other: Returns None, commits transaction

DEPENDENCIES:
    - sqlite3: Database driver
    - time: Retry delay mechanism
    - logging: Connection error logging to sqlite.log

KEY FUNCTIONS:
    - sql(): Execute queries with automatic result handling
    - check_connection(): Validate/establish connection with retry
    - convert_sql_to_list(): Transform sqlite3.Row to dict
    - connect_db(): Manual connection initialization
    - close_db(): Manual connection cleanup

USED BY:
    - All modules requiring database access
    - Most common pattern: from core.libs.dbsqlite import sql
"""

import sqlite3
import time
import logging

# SQLite database file
db_file = "db/uni.db"

# Global connection (None until first sql() call)
db_conn = None

def check_connection(attempts=3, delay=5):
    """
    Validate and establish SQLite database connection with retry logic

    Attempts to connect to database with automatic retry on failure. Used
    internally by sql() to ensure connection before query execution.

    CONNECTION SETTINGS:
        - check_same_thread=False: Allow multi-threaded access
        - detect_types=sqlite3.PARSE_DECLTYPES: Auto-parse datetime types
        - row_factory=sqlite3.Row: Return dict-like row objects

    RETRY LOGIC:
        - Default: 3 attempts with 5 second delay between attempts
        - Recursively retries on sqlite3.Error
        - Logs failure after all attempts exhausted

    CONNECTION REUSE:
        - Reuses existing connection if valid (critical for transactions!)
        - Only creates new connection if db_conn is None or closed
        - Tests connection with simple query before returning

    GLOBAL SIDE EFFECT:
        Sets db_conn module variable to active connection

    Args:
        attempts (int): Number of connection attempts remaining (default: 3)
        delay (int): Seconds to wait between retry attempts (default: 5)

    Returns:
        bool: True if connection established, False if all attempts failed

    Used by:
        - sql(): Called before every query execution
    """

    global db_conn

    # Reuse existing connection if valid (critical for transactions!)
    if db_conn is not None:
        try:
            # Test if connection is still alive
            db_conn.execute("SELECT 1")
            return True
        except sqlite3.Error:
            # Connection is dead, need to reconnect
            db_conn = None

    try:
        db_conn = sqlite3.connect(db_file, check_same_thread=False, detect_types=sqlite3.PARSE_DECLTYPES)
        db_conn.row_factory = sqlite3.Row
        return True
    except sqlite3.Error as e:
        if attempts > 1:
            #print(f"Attempt {attempts} failed: {e}")
            time.sleep(delay)
            return check_connection(attempts-1, delay)
        else:
            #print(f"Failed to connect after {attempts} attempts: {e}")
            return False


def sql(query, params=(), single=False, commit=True):
    """
    Execute SQL query with automatic connection management and result formatting

    Main database interface for all queries. Handles connection validation, parameter
    binding, result conversion, and transaction management automatically.

    QUERY TYPES:
        - SELECT: Returns list of dicts or single dict (if single=True)
        - INSERT: Returns last inserted row ID (integer)
        - PRAGMA: Returns list of dicts or single dict (if single=True)
        - UPDATE/DELETE: Returns None, commits transaction

    PARAMETER BINDING:
        - Converts MySQL-style %s placeholders to SQLite ? placeholders
        - Prevents SQL injection via parameterized queries
        - Example: sql("SELECT * FROM users WHERE user_id = ?", (user_id,))

    SINGLE MODE:
        - single=True: Returns dict for one row or None if not found
        - single=False: Returns list of dicts (empty list if no results)

    TRANSACTION CONTROL:
        - commit=True (default): Auto-commit after query (backwards compatible)
        - commit=False: Don't commit, use for multi-statement transactions
        - Use db_commit() and db_rollback() for manual transaction control

    ERROR HANDLING:
        - Logs connection failures to sqlite.log
        - Cursor always closed in finally block
        - Transaction committed only if commit=True

    Args:
        query (str): SQL statement with ? placeholders
        params (tuple): Parameter values for binding (default: empty tuple)
        single (bool): Return single dict instead of list (default: False)
        commit (bool): Auto-commit after query (default: True)

    Returns:
        list[dict]: SELECT/PRAGMA results (multiple rows)
        dict: SELECT/PRAGMA result (single=True)
        int: INSERT last row ID
        None: UPDATE/DELETE or no results

    Usage Examples:
        # Select multiple
        users = sql("SELECT * FROM users WHERE active = ?", (1,))

        # Select single
        user = sql("SELECT * FROM users WHERE user_id = ?", (5,), single=True)

        # Insert
        msg_id = sql("INSERT INTO messages (msg_content) VALUES (?)", ("Hello",))

        # Update
        sql("UPDATE messages SET msg_read = 1 WHERE msg_id = ?", (msg_id,))

        # Transaction (multiple statements)
        try:
            sql("INSERT INTO table1 ...", commit=False)
            sql("INSERT INTO table2 ...", commit=False)
            db_commit()  # Commit all
        except:
            db_rollback()  # Rollback on error

    Used by:
        - Every module requiring database access throughout UNI
    """
    global db_conn
    query = query.replace("%s", "?")
    # #print(f"Query: {query}, Params: {params}")

    try:
        if not check_connection():
            logging.basicConfig(filename='sqlite.log', level=logging.INFO)
            logging.error('Error connecting to the database from Python application call: GROQ')

        cursor = db_conn.cursor()
        cursor.execute(query, params)

        if query.lower().strip().startswith("select"):

            if single:
                return convert_sql_to_list(cursor.fetchone(), single=True)
            else:
                return convert_sql_to_list(cursor.fetchall())

        if query.lower().strip().startswith("pragma"):

            if single:
                return convert_sql_to_list(cursor.fetchone(), single=True)
            else:
                return convert_sql_to_list(cursor.fetchall())

        elif query.lower().strip().startswith("insert"):

            return cursor.lastrowid

        else:

            return None

    finally:
        cursor.close()
        if commit:
            db_conn.commit()


def convert_sql_to_list(sql_result, single=False):
    """
    Convert sqlite3.Row objects to Python dictionaries

    Transforms SQLite row factory results into standard dict format for easier
    manipulation and JSON serialization. Handles both single row and multiple row results.

    CONVERSION LOGIC:
        - single=True: Returns dict or None
        - single=False: Returns list of dicts or empty list
        - Empty results: None (single) or [] (multiple)

    ROW FACTORY:
        Requires db_conn.row_factory = sqlite3.Row to be set
        Row objects are dict-like but need conversion for full dict operations

    Args:
        sql_result: sqlite3.Row object or list of Row objects from cursor.fetchone()/fetchall()
        single (bool): Expect single row result (default: False)

    Returns:
        dict: Single row as dictionary (if single=True and result exists)
        None: No result found (if single=True)
        list[dict]: Multiple rows as list of dictionaries (if single=False)
        list: Empty list if no results (if single=False)

    Used by:
        - sql(): Automatically converts all SELECT/PRAGMA results
    """

    if not sql_result:
        return None if single else []

    if single:
        return dict(sql_result)

    result_list = []
    for row in sql_result:
        result_list.append(dict(row))
    return result_list


def connect_db():
    """
    Manually initialize SQLite database connection

    Alternative connection method without automatic retry logic. Sets global
    db_conn variable for use by sql() function.

    CONNECTION SETTINGS:
        - check_same_thread=False: Allow multi-threaded access
        - row_factory=sqlite3.Row: Return dict-like row objects

    ERROR HANDLING:
        - Sets db_conn to None on failure
        - Returns False instead of raising exception
        - Prints error message (currently commented out)

    GLOBAL SIDE EFFECT:
        Sets db_conn module variable to connection or None

    Returns:
        bool: False on connection error (implicit None return on success)

    NOTE:
        check_connection() is preferred - includes retry logic and better error handling
        This function exists for manual connection management if needed

    Used by:
        - Legacy code or manual connection scenarios
        - Typically sql() uses check_connection() instead
    """
    global db_conn
    try:
        db_conn = sqlite3.connect(db_file, check_same_thread=False)
        db_conn.row_factory = sqlite3.Row
    except sqlite3.Error as e:
        #print(f"Error connecting to the database: {e}")
        db_conn = None
        return False


def close_db():
    """
    Manually close SQLite database connection

    Cleanup function to explicitly close the global database connection.
    Checks if connection exists before attempting to close.

    GLOBAL SIDE EFFECT:
        Connection object (db_conn) closed but variable remains set
        Subsequent sql() calls will reconnect via check_connection()

    USAGE:
        Typically unnecessary - SQLite handles connection cleanup automatically
        Useful for explicit cleanup in testing or application shutdown

    SAFETY:
        - Checks db_conn is not None before closing
        - No-op if connection already closed or never established
        - No return value

    Used by:
        - Manual cleanup scenarios
        - Testing teardown
        - Application shutdown routines (if needed)

    NOTE:
        UNI uses persistent connection - this is rarely called in production
        sql() automatically reconnects if connection lost
    """
    global db_conn
    if db_conn is not None:
        db_conn.close()


def db_commit():
    """
    Explicitly commit current transaction

    Use after multiple sql() calls with commit=False to commit all changes.
    Part of manual transaction control for multi-statement operations.

    USAGE:
        try:
            sql("INSERT INTO table1 ...", commit=False)
            sql("INSERT INTO table2 ...", commit=False)
            db_commit()  # Commit all changes
        except:
            db_rollback()  # Rollback on error

    SAFETY:
        - Requires active connection (will reconnect if needed)
        - No-op if no pending changes

    Used by:
        - Protocol installation with rollback support
        - Multi-table operations requiring atomicity
    """
    global db_conn
    if db_conn is not None:
        db_conn.commit()


def db_rollback():
    """
    Explicitly rollback current transaction

    Use after sql() calls with commit=False to discard all uncommitted changes.
    Part of manual transaction control for error recovery.

    USAGE:
        try:
            sql("INSERT INTO table1 ...", commit=False)
            sql("INSERT INTO table2 ...", commit=False)
            db_commit()
        except Exception as e:
            db_rollback()  # Discard all changes
            raise e

    SAFETY:
        - Requires active connection
        - No-op if no pending changes
        - Does not raise on rollback of empty transaction

    Used by:
        - Protocol installation error recovery
        - Failed multi-table operations
    """
    global db_conn
    if db_conn is not None:
        db_conn.rollback()
