/**
 * SQL challenges. Each runs against two datasets in a real SQLite engine
 * (sql.js, in a web worker): the visible one you can explore, and a hidden
 * one with different rows, so hard-coded answers don't pass. Expected
 * results come from running `solution` on the same data.
 */

const SCHEMA = `
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, joined_on TEXT NOT NULL);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, price REAL NOT NULL);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), ordered_on TEXT NOT NULL, status TEXT NOT NULL);
CREATE TABLE order_items (order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL);
`;

const VISIBLE = `${SCHEMA}
INSERT INTO customers VALUES (1,'Aarav','Pune','2025-01-12'),(2,'Diya','Mumbai','2025-02-03'),(3,'Kabir','Pune','2025-03-21'),(4,'Meera','Bengaluru','2025-04-02'),(5,'Rohan','Pune','2025-05-15'),(6,'Sara','Delhi','2025-06-30');
INSERT INTO products VALUES (1,'Mechanical keyboard','Accessories',3500),(2,'USB-C hub','Accessories',1800),(3,'27" monitor','Displays',14500),(4,'Laptop stand','Accessories',1200),(5,'Webcam','Video',2600),(6,'Portable SSD','Storage',6200),(7,'Desk lamp','Accessories',900),(8,'Ergonomic chair','Furniture',12000);
INSERT INTO orders VALUES (1,1,'2025-07-01','delivered'),(2,2,'2025-07-03','delivered'),(3,1,'2025-07-10','cancelled'),(4,4,'2025-07-12','delivered'),(5,3,'2025-07-15','shipped'),(6,2,'2025-07-20','delivered');
INSERT INTO order_items VALUES (1,1,1),(1,2,2),(2,3,1),(3,6,1),(4,1,1),(4,4,1),(4,2,1),(5,2,3),(6,5,1),(6,4,2);
`;

const HIDDEN = `${SCHEMA}
INSERT INTO customers VALUES (1,'Ishaan','Chennai','2025-01-05'),(2,'Tara','Pune','2025-01-19'),(3,'Neel','Pune','2025-02-11'),(4,'Zoya','Mumbai','2025-03-08'),(5,'Om','Hyderabad','2025-03-30');
INSERT INTO products VALUES (1,'Noise-cancelling headphones','Audio',9000),(2,'Bluetooth speaker','Audio',4200),(3,'Mouse','Accessories',900),(4,'Mouse pad','Accessories',400),(5,'Ring light','Video',2100),(6,'Drawing tablet','Accessories',5600);
INSERT INTO orders VALUES (1,2,'2025-08-01','delivered'),(2,4,'2025-08-02','delivered'),(3,2,'2025-08-09','delivered'),(4,5,'2025-08-11','cancelled'),(5,3,'2025-08-15','delivered');
INSERT INTO order_items VALUES (1,1,1),(1,3,2),(2,2,2),(3,4,3),(4,6,1),(5,3,1),(5,4,1),(5,2,1);
`;

export const SQL_TABLES = [
  { name: 'customers', columns: 'id, name, city, joined_on' },
  { name: 'products', columns: 'id, name, category, price' },
  { name: 'orders', columns: 'id, customer_id, ordered_on, status' },
  { name: 'order_items', columns: 'order_id, product_id, quantity' },
];

const base = { kind: 'sql', skillId: 'sql', category: 'sql', datasets: [VISIBLE, HIDDEN], tables: SQL_TABLES };

export const SQL_CHALLENGES = [
  {
    ...base,
    id: 'sql-customers-in-city',
    difficulty: 'easy',
    title: 'Customers in Pune',
    prompt: 'List the names of all customers based in Pune, sorted alphabetically.',
    starter: 'SELECT name\nFROM customers\n-- your conditions here\n;',
    ordered: true,
    solution: "SELECT name FROM customers WHERE city = 'Pune' ORDER BY name;",
    hints: ['Filter rows with WHERE.', 'Sort with ORDER BY name.'],
    explanation: 'WHERE keeps only matching rows; ORDER BY makes the order deterministic, which matters whenever a result is shown to a user.',
  },
  {
    ...base,
    id: 'sql-revenue-per-customer',
    difficulty: 'medium',
    title: 'Revenue per customer',
    prompt:
      'For each customer with at least one non-cancelled order, return their name and total spend (quantity × price across all their non-cancelled orders), highest spend first. Return two columns: name, total.',
    starter: 'SELECT c.name, ... AS total\nFROM customers c\n-- join orders, order_items and products\n;',
    ordered: true,
    solution: `SELECT c.name, SUM(oi.quantity * p.price) AS total
FROM customers c
JOIN orders o ON o.customer_id = c.id AND o.status <> 'cancelled'
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
GROUP BY c.id, c.name
ORDER BY total DESC, c.name;`,
    hints: ['You need four tables: customers → orders → order_items → products.', 'Exclude cancelled orders in the join or a WHERE clause.', 'GROUP BY the customer and SUM(quantity * price).'],
    explanation: 'Joining down the chain multiplies rows per item, which is what SUM needs. Filtering cancelled orders before aggregating keeps them out of the total.',
  },
  {
    ...base,
    id: 'sql-never-ordered',
    difficulty: 'medium',
    title: 'Products nobody ordered',
    prompt: 'Return the names of products that appear in no order at all (cancelled orders count as orders), sorted by name.',
    starter: 'SELECT p.name\nFROM products p\n-- find products with no order_items\n;',
    ordered: true,
    solution: 'SELECT p.name FROM products p LEFT JOIN order_items oi ON oi.product_id = p.id WHERE oi.product_id IS NULL ORDER BY p.name;',
    hints: ['A LEFT JOIN keeps products even when there is no matching order item.', 'Unmatched rows have NULL in the joined columns.', 'NOT EXISTS (SELECT 1 FROM order_items …) works too.'],
    explanation: 'An anti-join (LEFT JOIN … IS NULL, or NOT EXISTS) finds rows with no match. NOT IN can surprise you when the subquery returns NULLs.',
  },
  {
    ...base,
    id: 'sql-top-product-per-category',
    difficulty: 'hard',
    title: 'Best-selling product per category',
    prompt:
      'For every product category, return the category and the name of the product with the highest revenue (quantity × price, excluding cancelled orders). Ignore products with no sales. If two products tie, pick the alphabetically first name. Sort by category. Columns: category, name.',
    starter: '-- Tip: window functions like ROW_NUMBER() are supported\nWITH revenue AS (\n  SELECT ...\n)\nSELECT ...;',
    ordered: true,
    solution: `WITH revenue AS (
  SELECT p.category, p.name, SUM(oi.quantity * p.price) AS total
  FROM products p
  JOIN order_items oi ON oi.product_id = p.id
  JOIN orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
  GROUP BY p.id
), ranked AS (
  SELECT category, name, ROW_NUMBER() OVER (PARTITION BY category ORDER BY total DESC, name) AS rn
  FROM revenue
)
SELECT category, name FROM ranked WHERE rn = 1 ORDER BY category;`,
    hints: ['First compute revenue per product in a CTE.', 'ROW_NUMBER() OVER (PARTITION BY category ORDER BY total DESC, name) ranks products within each category.', 'Keep rank 1.'],
    explanation: 'Window functions rank rows within a group without collapsing them, which makes “top N per group” queries readable. The extra ORDER BY name makes ties deterministic.',
  },
];
