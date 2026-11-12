---
id: jdbc-networking
title: JDBC and Networking
track: java-advanced
section: jdbc-networking
order: 1
difficulty: Advanced
importance: 3
tags: [JDBC, SQL, Networking, Sockets, HTTP]
prerequisites: [exception-handling]
related: [exception-handling, collections-framework]
status: complete
lastUpdated: 2026-11-12
summary: JDBC connects Java code to relational databases with SQL and prepared statements, while sockets and HTTP clients connect it to services over a network.
---

## Overview

Most Java applications talk to two kinds of external system: a database and a network service. JDBC is the standard Java API for relational databases, giving you connections, statements, and result sets in a database-independent way. Networking in plain Java is built on sockets for raw TCP communication and on `HttpClient` for HTTP.

In modern Spring applications you will usually work through Spring Data JPA or a web client rather than raw JDBC or sockets, but understanding this layer explains connection handling, transactions, and failure modes that higher-level frameworks hide from you.

## Theory

### JDBC basics

JDBC code follows a fixed shape. You obtain a `Connection`, create a `Statement` or `PreparedStatement`, execute SQL, and read results from a `ResultSet`. A connection represents a session with the database, and it is an expensive resource, so applications do not create one per query in production. They use a connection pool, such as HikariCP, which keeps a set of open connections ready to hand out and returns them when you close them.

`DriverManager.getConnection` loads the database driver and opens a connection from a JDBC URL, username, and password. The driver itself comes from a dependency for your database, such as the PostgreSQL or MySQL driver, and modern drivers register themselves automatically, so an explicit `Class.forName` call is no longer needed. The URL format is database-specific, for example starting with `jdbc:postgresql://` for PostgreSQL.

### Statements and SQL injection

A plain `Statement` executes SQL exactly as written, including any values you concatenated into the string. That is how SQL injection happens: a value containing SQL syntax changes the meaning of the query. A `PreparedStatement` uses placeholders, written as `?`, and you bind values with methods such as `setString` and `setInt`. The database treats bound values as data, never as SQL, so injection through a bound parameter is not possible, and the database can reuse the parsed statement. Use `PreparedStatement` whenever a query contains a value from outside the code, and reserve plain statements for fixed SQL with no parameters.

`executeQuery` runs a query that returns rows, `executeUpdate` runs an insert, update, or delete and returns the number of affected rows, and `execute` is for SQL where you do not know in advance whether it returns rows. A `ResultSet` is a cursor over the returned rows. You advance it with `next()`, which returns `false` when there are no more rows, and read columns by name or index with getters such as `getString` and `getInt`. Always close connections, statements, and result sets, and `try-with-resources` does that for you in the right order even when an exception occurs.

### Transactions

By default, a JDBC connection runs in auto-commit mode, where each statement is its own transaction and is committed immediately. For work that must succeed or fail as a unit, turn auto-commit off with `setAutoCommit(false)`, run your statements, and then call `commit()`. If anything fails, call `rollback()` to undo the whole unit. A common mistake is catching an exception, logging it, and continuing without rolling back, which leaves the transaction in an unknown state. Another is forgetting to restore auto-commit when returning a pooled connection, though a good pool resets connection state for you.

Transaction isolation levels control what one transaction can observe of concurrent transactions, trading consistency against concurrency. The standard levels are read uncommitted, read committed, repeatable read, and serializable. The default depends on the database, and most applications leave it alone unless they have a specific anomaly to prevent, such as phantom reads or non-repeatable reads.

### Sockets

A socket is one endpoint of a two-way network connection. A client creates a `Socket` to a host and port, and a server creates a `ServerSocket` that listens on a port and accepts incoming connections, each producing its own `Socket` for that client. Data travels as streams, so you wrap the socket's input and output streams in readers and writers or buffered streams.

Sockets are blocking by default, and a server that handles one client at a time will stall other clients, so real servers accept connections in a loop and hand each one to a thread or a virtual thread. Since Java 21, a virtual thread per connection is a natural fit for this pattern.

### HTTP with HttpClient

`HttpClient`, available since Java 11, is the modern way to make HTTP requests without a third-party library. You build a client once and reuse it, build a request with a URI, method, headers, and body, and send it synchronously with `send` or asynchronously with `sendAsync`, which returns a `CompletableFuture`. The response gives you a status code, headers, and a body, and `BodyHandlers` control how the body is read, for example as a string or discarded. For anything beyond simple calls, such as retries, connection pooling details, or JSON mapping, most projects use a library or a framework client, but `HttpClient` covers straightforward service-to-service calls well.

### Errors and resources in network code

Database and network calls fail in ways local code does not: connections drop, servers time out, and a query can deadlock with another transaction. JDBC reports failures as `SQLException`, a checked exception carrying a SQL state code and a vendor code, and often a chain of causes. Network code throws `IOException` and its subclasses, such as `SocketTimeoutException`.

Handle these at a boundary where you can decide whether to retry, and only retry operations that are safe to repeat. A retried insert that is not idempotent can create duplicate rows. Timeouts matter here too: a request with no timeout can hang forever on a dead connection, so set connect and read timeouts on HTTP clients and query timeouts where your driver supports them.

## Key Concepts

- **Connection:** a session with a database, expensive to create, normally obtained from a pool.
- **Connection pool:** a reusable set of open connections, such as HikariCP, that avoids opening a connection per query.
- **PreparedStatement:** a pre-parsed statement with bound parameters, which prevents SQL injection through those parameters.
- **ResultSet:** a cursor over query results, advanced with `next()` and read with typed getters.
- **Transaction:** a unit of work committed or rolled back as a whole, controlled with auto-commit, `commit()`, and `rollback()`.
- **Socket and ServerSocket:** the client and listening endpoints of a TCP connection.
- **HttpClient:** the Java 11 HTTP client for synchronous and asynchronous requests.
- **SQLException:** the checked exception type for JDBC failures, carrying SQL state and vendor codes.

## Code Examples

### Querying safely with a PreparedStatement

```java
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class UserLookup {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:postgresql://localhost:5432/appdb";
        String sql = "SELECT id, name FROM users WHERE email = ?";
        try (Connection connection = DriverManager.getConnection(url, "app", "secret");
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, "ada@example.com");
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    System.out.println(rows.getInt("id") + ": " + rows.getString("name"));
                }
            }
        }
    }
}
```

Explanation: this code needs a running PostgreSQL database and its driver on the classpath to actually run, but it compiles against the standard `java.sql` API alone. The email is bound as a parameter rather than concatenated into the SQL, so a value containing SQL syntax cannot change the query. `try-with-resources` closes the result set, statement, and connection in the correct order even if a query fails.

### A transfer in one transaction

```java
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class TransferDemo {
    public static void transfer(Connection connection, int fromId, int toId, int amount)
            throws SQLException {
        String debit = "UPDATE accounts SET balance = balance - ? WHERE id = ?";
        String credit = "UPDATE accounts SET balance = balance + ? WHERE id = ?";
        connection.setAutoCommit(false);
        try (PreparedStatement debitStmt = connection.prepareStatement(debit);
             PreparedStatement creditStmt = connection.prepareStatement(credit)) {
            debitStmt.setInt(1, amount);
            debitStmt.setInt(2, fromId);
            debitStmt.executeUpdate();
            creditStmt.setInt(1, amount);
            creditStmt.setInt(2, toId);
            creditStmt.executeUpdate();
            connection.commit();
        } catch (SQLException ex) {
            connection.rollback();
            throw ex;
        } finally {
            connection.setAutoCommit(true);
        }
    }
}
```

Explanation: both updates share one transaction, so the money cannot be debited without being credited. A failure rolls the whole transfer back, the original exception is rethrown so the caller knows the transfer failed, and auto-commit is restored in the `finally` block so a pooled connection is not returned in a surprising state.

### A small local echo server and client

```java
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;

public class EchoDemo {
    public static void main(String[] args) throws Exception {
        ServerSocket server = new ServerSocket(0);
        int port = server.getLocalPort();
        Thread serverThread = new Thread(() -> {
            try (Socket client = server.accept();
                 BufferedReader in = new BufferedReader(
                         new InputStreamReader(client.getInputStream()));
                 PrintWriter out = new PrintWriter(client.getOutputStream(), true)) {
                out.println("Echo: " + in.readLine());
            } catch (Exception ex) {
                throw new RuntimeException(ex);
            }
        });
        serverThread.start();
        try (Socket socket = new Socket("localhost", port);
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
             BufferedReader in = new BufferedReader(
                     new InputStreamReader(socket.getInputStream()))) {
            out.println("hello");
            System.out.println(in.readLine());
        }
        serverThread.join();
        server.close();
    }
}
```

Output:

```
Echo: hello
```

Explanation: the server listens on an automatically assigned port, accepts one connection, reads a line, and writes it back prefixed with `Echo: `. The client connects to that port, sends `hello`, and prints the reply. In a real server the accept loop would keep running and hand each connection to its own thread.

### An HTTP GET with HttpClient

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class HttpDemo {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://example.com"))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        HttpResponse<String> response = client.send(
                request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.statusCode());
    }
}
```

Explanation: this needs network access to run, and the status code it prints depends on the server's reply. The important parts are structural: one reusable client, a connect timeout and a request timeout so a dead server cannot hang the call forever, and a body handler that decides how the response body is read.

## Best Practices

- Always use `PreparedStatement` with bound parameters for any value that comes from outside the code.
- Use `try-with-resources` for connections, statements, result sets, sockets, and streams, so they close even when an exception occurs.
- Get connections from a pool in production, and return them promptly by closing them when you are done.
- Keep transactions short, commit or roll back explicitly, and restore auto-commit before returning a connection to a pool.
- Set timeouts on HTTP requests, database queries, and socket operations, so a dead peer cannot hang a thread forever.
- Retry only idempotent operations, and bound the number of retries with a backoff, rather than retrying blindly.
- Close a `ServerSocket` and stop its accept loop on shutdown, and handle each accepted connection on its own thread or virtual thread.

## Common Mistakes

- Concatenating user input into SQL, which opens the door to SQL injection.
- Leaking connections by not closing them, which eventually exhausts the pool and stalls the application.
- Catching a `SQLException` inside a transaction and continuing without rolling back, leaving the transaction half done.
- Forgetting that a `ResultSet` starts before the first row, and reading columns before calling `next()`.
- Writing a server that accepts one connection and blocks, so a second client can never connect.
- Making HTTP calls with no timeout, so one slow or dead service hangs a thread indefinitely.
- Retrying a non-idempotent insert, which can create duplicate rows on the second attempt.

## Interview Importance

JDBC and networking questions test whether you understand what frameworks abstract away. Expect to explain `Statement` versus `PreparedStatement`, SQL injection and how binding prevents it, connection pooling, transactions and rollback, and the difference between a socket and an HTTP client. A practical interview may ask you to write a small JDBC query with proper resource handling, or to explain why a connection leak brings an application down over time.

## Interview Questions

- **Why is PreparedStatement preferred over Statement?** Because values are bound as data rather than spliced into the SQL text, which prevents SQL injection through those values and lets the database reuse the parsed statement.
- **What happens if you do not close a JDBC connection?** The connection stays open and, in a pooled application, is never returned to the pool, so the pool eventually runs out and new queries block or fail.
- **How do you make two updates succeed or fail together?** Turn auto-commit off, run both updates on the same connection, commit at the end, and roll back if any step fails.
- **What is the difference between a socket and HttpClient?** A socket is a raw TCP endpoint for sending bytes in whatever protocol you define, while `HttpClient` implements HTTP, handling requests, responses, headers, and status codes for you.
- **Why do network calls need timeouts?** Because a peer can stop responding without closing the connection, and without a timeout the calling thread waits forever instead of failing and recovering.

## Revision Summary

- JDBC gives you connections, statements, and result sets; pools supply connections in production.
- `PreparedStatement` binds values as data, which prevents SQL injection and enables statement reuse.
- `try-with-resources` closes database and network resources in the right order, even on failure.
- Transactions group statements into one atomic unit with `commit()` and `rollback()`, and auto-commit must be restored for pooled connections.
- Sockets provide raw TCP communication, with a server accepting connections and handling each one separately.
- `HttpClient` is the modern HTTP API, and every network call needs a timeout and a retry policy that respects idempotency.
