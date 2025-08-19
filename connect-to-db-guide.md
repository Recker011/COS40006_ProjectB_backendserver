# Database Connection Guide

This guide provides instructions for connecting to the MySQL database used in the COS40006 Project B backend server. The database is hosted on Aiven, and all connections require SSL encryption.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Connection Parameters](#connection-parameters)
- [MySQL Command Line Client](#mysql-command-line-client)
- [MySQL Shell (mysqlsh)](#mysql-shell-mysqlsh)
- [Python](#python)
- [PHP](#php)
- [Java](#java)
- [MySQL Workbench](#mysql-workbench)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Prerequisites

Before connecting to the database, ensure you have the following:

1. **CA Certificate**: The `ca.pem` file is required for SSL verification. This file should be placed in the `certs/` directory of your project.
2. **Connection Credentials**: Database credentials are provided in the `db.js` file in the project root.

## Connection Parameters

All connections to the database should use the following parameters:

- **Host**: `cos40006-projectb-cleaningdb-eaca.c.aivencloud.com`
- **Port**: `11316`
- **Database**: `defaultdb`
- **Username**: `avnadmin`
- **Password**: `AVNS_aEf_73ImCqt_JMyVyAD`
- **SSL Mode**: `REQUIRED`

## MySQL Command Line Client

To connect using the MySQL command line client:

1. Install the MySQL client:
   ```bash
   # On Ubuntu/Debian
   sudo apt-get install mysql-client

   # On macOS with Homebrew
   brew install mysql-client

   # On Windows, download from https://dev.mysql.com/downloads/mysql/
   ```

2. From your terminal, run the following command:
   ```bash
   mysql --user avnadmin --password=AVNS_aEf_73ImCqt_JMyVyAD \
     --host cos40006-projectb-cleaningdb-eaca.c.aivencloud.com \
     --port 11316 defaultdb
   ```

3. To confirm that the connection is working, issue the following query:
   ```sql
   SELECT 1 + 2 AS three;
   ```

4. The output should look like the following if the connection was successful:
   ```
   +-------+
   | three |
   +-------+
   |     3 |
   +-------+
   1 row in set (0.0539 sec)
   ```

## MySQL Shell (mysqlsh)

To connect using MySQL Shell:

1. Install the MySQL Shell client:
   ```bash
   # On Ubuntu/Debian
   sudo apt-get install mysql-shell

   # On macOS with Homebrew
   brew install mysql-client

   # On Windows, download from https://dev.mysql.com/downloads/shell/
   ```

2. From your terminal, run the following command:
   ```bash
   mysqlsh --sql 'mysql://avnadmin:AVNS_aEf_73ImCqt_JMyVyAD@cos40006-projectb-cleaningdb-eaca.c.aivencloud.com:11316/defaultdb?ssl-mode=REQUIRED'
   ```

3. To confirm that the connection is working, issue the following query:
   ```sql
   SELECT 1 + 2 AS three;
   ```

4. The output should look like the following if the connection was successful:
   ```
   +-------+
   | three |
   +-------+
   |     3 |
   +-------+
   1 row in set (0.0539 sec)
   ```

## Python

To connect using Python:

1. Install the required libraries:
   ```bash
   pip install pymysql cryptography
   ```

2. Create a file named `main.py` with the following content:
   ```python
   import pymysql

   timeout = 10
   connection = pymysql.connect(
     charset="utf8mb4",
     connect_timeout=timeout,
     cursorclass=pymysql.cursors.DictCursor,
     db="defaultdb",
     host="cos40006-projectb-cleaningdb-eaca.c.aivencloud.com",
     password="AVNS_aEf_73ImCqt_JMyVyAD",
     read_timeout=timeout,
     port=11316,
     user="avnadmin",
     write_timeout=timeout,
   )
     
   try:
     cursor = connection.cursor()
     cursor.execute("CREATE TABLE mytest (id INTEGER PRIMARY KEY)")
     cursor.execute("INSERT INTO mytest (id) VALUES (1), (2)")
     cursor.execute("SELECT * FROM mytest")
     print(cursor.fetchall())
   finally:
     connection.close()
   ```

3. Run the code:
   ```bash
   python main.py
   ```

4. If the script runs successfully, the output will be the values that were inserted into the table:
   ```
   [{'id': 1}, {'id': 2}]
   ```

## PHP

To connect using PHP:

1. Create a file named `index.php` with the following content:
   ```php
   <?php

   $uri = "mysql://avnadmin:AVNS_aEf_73ImCqt_JMyVyAD@cos40006-projectb-cleaningdb-eaca.c.aivencloud.com:11316/defaultdb?ssl-mode=REQUIRED";

   $fields = parse_url($uri);

   // build the DSN including SSL settings
   $conn = "mysql:";
   $conn .= "host=" . $fields["host"];
   $conn .= ";port=" . $fields["port"];;
   $conn .= ";dbname=defaultdb";
   $conn .= ";sslmode=verify-ca;sslrootcert=ca.pem";

   try {
     $db = new PDO($conn, $fields["user"], $fields["pass"]);

     $stmt = $db->query("SELECT VERSION()");
     print($stmt->fetch()[0]);
   } catch (Exception $e) {
     echo "Error: " . $e->getMessage();
   }
   ```

2. Download the CA certificate. This example assumes it is in a local file called `ca.pem`.

3. Run the code:
   ```bash
   php index.php
   ```

4. If the script runs successfully, the output is the MySQL version of your service:
   ```
   8.0.35
   ```

## Java

To connect using Java:

1. Create a file named `MySqlExample.java` with the following content:
   ```java
   import java.sql.Connection;
   import java.sql.DriverManager;
   import java.sql.ResultSet;
   import java.sql.SQLException;
   import java.sql.Statement;
   import java.util.Locale;
     
   public class MySqlExample {
     public static void main(String[] args) throws ClassNotFoundException {
       String host, port, databaseName, userName, password;
       host = port = databaseName = userName = password = null;
       for (int i = 0; i < args.length - 1; i++) {
         switch (args[i].toLowerCase(Locale.ROOT)) {
           case "-host": host = args[++i]; break;
           case "-username": userName = args[++i]; break;
           case "-password": password = args[++i]; break;
           case "-database": databaseName = args[++i]; break;
           case "-port": port = args[++i]; break;
         }
       }
       // JDBC allows to have nullable username and password
       if (host == null || port == null || databaseName == null) {
         System.out.println("Host, port, database information is required");
         return;
       }
       Class.forName("com.mysql.cj.jdbc.Driver");
       try (final Connection connection =
                   DriverManager.getConnection("jdbc:mysql://" + host + ":" + port + "/" + databaseName + "?sslmode=require", userName, password);
            final Statement statement = connection.createStatement();
            final ResultSet resultSet = statement.executeQuery("SELECT version() AS version")) {

         while (resultSet.next()) {
           System.out.println("Version: " + resultSet.getString("version"));
         }
       } catch (SQLException e) {
         System.out.println("Connection failure.");
         e.printStackTrace();
       }
     }
   }
   ```

2. Download the MySQL JDBC Driver:
   - Manually, the jar can be downloaded from https://dev.mysql.com/downloads/connector/j/.
   - Or in case you have maven version >= 2+ run the code:
     ```bash
     mvn org.apache.maven.plugins:maven-dependency-plugin:2.8:get -Dartifact=mysql:mysql-connector-java:8.0.28:jar -Ddest=mysql-driver-8.0.28.jar
     ```

3. Run the code:
   ```bash
   javac MySqlExample.java && java -cp mysql-driver-8.0.28.jar:. MySqlExample -host cos40006-projectb-cleaningdb-eaca.c.aivencloud.com -port 11316 -database defaultdb -username avnadmin -password AVNS_aEf_73ImCqt_JMyVyAD
   ```
   
   Note: Make sure the MySQL JDBC Driver `mysql-driver-8.0.28.jar` is in the same folder and that the version matches the one you have downloaded.

4. If the script runs successfully, the output includes the MySQL version of your service:
   ```
   Version: 8.0.35
   ```

## MySQL Workbench

To connect using MySQL Workbench:

1. Download the MySQL Workbench client from https://dev.mysql.com/downloads/workbench/.

2. Download the CA certificate.

3. On the menu bar, select `Database > Connect to Database...` then fill in the required information:
   - Hostname: `cos40006-projectb-cleaningdb-eaca.c.aivencloud.com`
   - Port: `11316`
   - Username: `avnadmin`
   - Password: Ask the password in the Discord endpoint channel

4. Switch to the SSL tab, select the downloaded CA certificate as the SSL CA file and then click OK.

Now the connection to the Aiven for MySQL® database should be established.

## Security Considerations

When connecting to the database, keep the following security considerations in mind:

1. **Always use SSL**: All connections to the database must use SSL encryption. The CA certificate (`ca.pem`) is required for verifying the server's identity.

2. **Protect credentials**: Never hardcode database credentials in your source code. For development, credentials are provided in `db.js`, but in production, use environment variables or a secure secrets management system.

3. **Limit permissions**: The database user should have the minimum permissions necessary to perform its tasks.

4. **Use connection pooling**: For applications that make frequent database requests, use connection pooling to manage connections efficiently and securely.

## Troubleshooting

If you encounter issues connecting to the database, try these troubleshooting steps:

1. **Verify the CA certificate**: Ensure the `ca.pem` file is in the correct location (`certs/` directory) and is valid.

2. **Check network connectivity**: Verify that you can reach the database host and port:
   ```bash
   telnet cos40006-projectb-cleaningdb-eaca.c.aivencloud.com 11316
   ```

3. **Verify credentials**: Double-check the username and password in `db.js`.

4. **Check firewall settings**: Ensure your firewall or network settings are not blocking the connection.

5. **SSL issues**: If you encounter SSL-related errors, verify that your MySQL client supports the required SSL protocols.

## Best Practices

Follow these best practices when working with the database:

1. **Use parameterized queries**: Always use parameterized queries or prepared statements to prevent SQL injection attacks.

2. **Handle connections properly**: Always close database connections when finished to prevent connection leaks.

3. **Implement proper error handling**: Handle database errors gracefully and log them appropriately.

4. **Use connection pooling**: For production applications, use connection pooling to manage database connections efficiently.

5. **Monitor performance**: Regularly monitor database performance and optimize queries as needed.