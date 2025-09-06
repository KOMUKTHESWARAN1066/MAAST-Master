import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useTable } from 'react-table';
import axios from 'axios';
import { DateTime } from 'luxon';
import { FaFileDownload, FaEye, FaEyeSlash, FaSave } from 'react-icons/fa';
import { Container, Button, CircularProgress, Snackbar } from '@mui/material'; // Import Material-UI components
import '../styles/UserShiftUpload.css'; // Import the CSS file
// import { maxWidth } from '@mui/system';

const UserShiftUpload = () => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [notification, setNotification] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false); // State for loading
  const [snackbarOpen, setSnackbarOpen] = useState(false); // State for Snackbar

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      // No file selected
      setMessage("No file selected.");
      setSnackbarOpen(true); // Open Snackbar
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const binaryStr = e.target.result;
      const workbook = XLSX.read(binaryStr, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const columns = jsonData[0].map((col, index) => ({ Header: col, accessor: `col${index}` }));
      const rows = jsonData.slice(1).map((row, rowIndex) =>
        row.reduce((acc, cell, colIndex) => {
          acc[`col${colIndex}`] = cell;
          return acc;
        }, { id: rowIndex })
      );

      setColumns(columns);
      setData(rows);
      setNotification('File uploaded successfully');
      setShowTable(false);
    };

    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification('');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const parseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') {
      return null;
    }
    const isDDMMYYYY = DateTime.fromFormat(dateStr, 'dd-MM-yyyy').isValid;
    const isYYYYMMDD = DateTime.fromFormat(dateStr, 'yyyy-MM-dd').isValid;
    if (isDDMMYYYY) {
      return DateTime.fromFormat(dateStr, 'dd-MM-yyyy').toFormat('yyyy-MM-dd');
    } else if (isYYYYMMDD) {
      return dateStr;
    } else {
      dateStr = null;
    }
    return dateStr;
  };

 const handleUserShifts = async () => {
  setLoading(true);
  const batchSize = 50;
  const totalRecords = data.length;
  let allInvalidRows = [];

  for (let i = 0; i < totalRecords; i += batchSize) {
    const currentBatch = data.slice(i, i + batchSize);

    try {
      const response = await axios.post(
        "https://192.168.2.54:443/api/saveUserShifts",
        currentBatch,
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data.invalidRows && response.data.invalidRows.length > 0) {
        allInvalidRows = [...allInvalidRows, ...response.data.invalidRows];
      }

      setMessage(`Processed ${Math.min(i + batchSize, totalRecords)} of ${totalRecords} records...`);
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error("Error saving shifts:", error);
      setMessage("Error saving shifts. Please try again.");
      setLoading(false);
      return;
    }
  }

  if (allInvalidRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(allInvalidRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invalid Rows");
    XLSX.writeFile(wb, "InvalidUserShifts.xlsx");
  }

  setMessage("✅ All shifts processed successfully!");
  setLoading(false);
  setTimeout(() => setMessage(""), 5000);
};



  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = 'https://192.168.2.54:443/download-template';
    link.download = 'skill upload.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tableInstance = useTable({ columns, data });

  return (
    <Container maxWidth="lg" style={{ maxWidth: '100%' }}>
      <h2 className="title">User Shift Upload</h2>
      <div className="file-upload">
        <input className="input-file" type="file" accept=".xlsx" onChange={handleFileUpload} />
      </div>
      {notification && (
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          message={notification}
        />
      )}
      {data.length > 0 && (
        <div className="d-flex justify-content-between mb-3">
          <Button variant="contained" onClick={() => setShowTable(!showTable)}>
            {showTable ? <><FaEyeSlash className="icon" /> Hide Data</> : <><FaEye className="icon" /> View Data</>}
          </Button>
          <Button variant="contained" color="primary" onClick={handleUserShifts} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : <><FaSave className="icon" /> Save</>}
          </Button>
        </div>
      )}
      <div className="d-flex justify-content-first mb-3">
        <Button variant="contained" onClick={downloadTemplate}>
          <FaFileDownload className="icon" /> Download Sample Template
        </Button>
      </div>

      {message && <div className="message">{message}</div>}
      {showTable && data.length > 0 && (
        <table className="data-table" {...tableInstance.getTableProps()}>
          <thead>
            {tableInstance.headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()} key={headerGroup.id}>
                {headerGroup.headers.map((column) => (
                  <th {...column.getHeaderProps()} key={column.id}
                  style={{
    backgroundColor: '#484c61ff', // Blue background
    color: 'white',            // White text
    fontWeight: 'bold',
    textAlign: 'center',
    padding: '10px',
    borderBottom: '2px solid #ddd'
  }}>
                    {column.render('Header')}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...tableInstance.getTableBodyProps()}>
            {tableInstance.rows.map((row) => {
              tableInstance.prepareRow(row);
              return (
                <tr {...row.getRowProps()} key={row.id}>
                  {row.cells.map((cell) => (
                    <td {...cell.getCellProps()} key={cell.column.id}>
                      {cell.render('Cell')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Container>
  );
};

export default UserShiftUpload;
