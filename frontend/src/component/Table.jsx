const Table = ({ columns, data, children }) => {
  const headers = columns.map((col) => col.header);

  const rows = data.map((row) => ({
    source: row,
    cells: columns.map((col) =>
      typeof col.accessor === "function" ? col.accessor(row) : row[col.accessor]
    ),
  }));

  return children({ headers, rows });
};

export default Table;
