import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useTable } from 'react-table';
import axios from 'axios';
import { DateTime } from 'luxon';
import { FaFileDownload, FaEye, FaEyeSlash, FaSave } from 'react-icons/fa';
import { Container, Button, CircularProgress, Snackbar } from '@mui/material'; // Import Material-UI components
import '../styles/UserShiftUpload.css'; // Import the CSS file
// import { maxWidth } from '@mui/system';

const EmployeeJobCardUpload = () => {
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
    setMessage("No file selected.");
    setSnackbarOpen(true);
    return;
  }

  const reader = new FileReader();

  reader.onload = (e) => {
    const binaryStr = e.target.result;
    const workbook = XLSX.read(binaryStr, { type: 'binary' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const headers = jsonData[0];
    if (headers.length < 6) {
      alert("Invalid Excel format. Expected columns: Edatetime, UserID, Job_Target, Job_actual, Job_rejns, PPE");
      return;
    }

const formatDatefordisplay = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string" || dateStr.trim() === "") {
    return "N/A";
  }

  const parts = dateStr.split("/");
  if (parts.length !== 3) {
    return "N/A";
  }

  const [day, month, year] = parts;
  return `${day}-${month}-${year}`; // dd-mm-yyyy
};

    const rows = jsonData.slice(1).map((row) => {
      let formattedDate = null;
      
  let displayDate = null;
      if (row[0]) {
    if (typeof row[0] === 'number') {
      const excelDate = XLSX.SSF.parse_date_code(row[0]);
      displayDate = `${String(excelDate.d).padStart(2, '0')}-${String(excelDate.m).padStart(2, '0')}-${excelDate.y}`;
      formattedDate = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
    } else {
      const parsedDate = DateTime.fromFormat(row[0], 'dd-MM-yyyy');
      if (parsedDate.isValid) {
        displayDate = parsedDate.toFormat('dd-MM-yyyy');
        formattedDate = parsedDate.toFormat('yyyy-MM-dd');
      }}
      }

      return {
          Edatetime: formattedDate,   // backend format
  DisplayDate: displayDate,
        UserID: row[1] || '',
        Job_Target: parseInt(row[2] || 0),
        Job_Actual: parseInt(row[3] || 0),
        Job_Rejns: parseInt(row[4] || 0),
        job_5S: parseInt(row[5]||  0),
        PPE: parseInt(row[6] || 0),
        Job_Disclipline:parseInt( row[7] ||0)
      };
    });

    // ✅ Map headers dynamically to data keys
    const keyMap = ['DisplayDate', 'UserID', 'Job_Target', 'Job_Actual', 'Job_Rejns','job_5S', 'PPE', 'Job_Disclipline'];
    const dynamicColumns = headers.map((col, i) => ({
      Header: col,
      accessor: keyMap[i] || `extra${i}`
    }));

    setColumns(dynamicColumns);
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

 const handleJobCardUpload = async () => {
  setLoading(true);
  try {
    const response = await axios.post('https://192.168.2.54:443/api/jobcard-upload', data, {

      headers: { 'Content-Type': 'application/json' }
    });
    setMessage('Employee Job Card saved successfully');
  } catch (error) {
    console.error('Error saving job cards:', error);
    setMessage('Error saving job cards: ' + error.message);
  } finally {
    setLoading(false);
    setTimeout(() => setMessage(''), 5000);
  }
};


  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = 'https://192.168.2.54:443/download-templatejob';
    link.download = 'EmployeeJobCardSampleData.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tableInstance = useTable({ columns, data });

  return (
    <Container maxWidth="lg" style={{ maxWidth: '100%' }}>
      <h2 className="title">Employee Job Card Upload</h2>
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
          <Button variant="contained" color="primary" onClick={handleJobCardUpload} disabled={loading}>
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
                  <th {...column.getHeaderProps()} key={column.id}  style={{
    backgroundColor: '#484c61ff', // Blue background
    color: 'white',            // White text
    fontWeight: 'bold',
    textAlign: 'center',
    padding: '10px',
    borderBottom: '2px solid #ddd'
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

export default EmployeeJobCardUpload;
