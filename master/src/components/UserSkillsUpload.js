import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useTable } from 'react-table';
import axios from 'axios';
import { FaFileDownload, FaEye, FaEyeSlash, FaSave } from 'react-icons/fa';
import { Container, Button, CircularProgress, Snackbar } from '@mui/material'; // Import Material-UI components
import '../styles/UserShiftUpload.css'; // Import the CSS file

const UserSkillsUpload = () => {
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
      const arrayBuffer = e.target.result;
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
      if (jsonData.length === 0) {
        setMessage("No data found in the file.");
        setSnackbarOpen(true);
        return;
      }
  
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
      setShowTable(true);
    };
  
    reader.readAsArrayBuffer(file);
  };
  

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification('');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [notification]);



//   const handleUserShifts = async () => {
//     setLoading(true); // Set loading to true
//     const batchSize = 50;
//     const totalRecords = data.length;

//     for (let i = 0; i < totalRecords; i += batchSize) {
//       const shiftsBatch = [];

//       for (let j = i; j < Math.min(i + batchSize, totalRecords); j++) {
//         for (let k = 4; k <= 6; k++) {
//           const date = parseDate(columns[k].Header);
//           if (date === null) {
//             alert('Invalid date format');
//             setLoading(false); // Set loading to false on error
//             return;
//           }
//           shiftsBatch.push({
//             "Shift_date_from": date,
//             "Shift_date_to": date,
//             "userid": data[j].col0,
//             "STAGE_NAME": data[j].col2,
//             "SHIFT_ID": data[j]['col' + k],
//             "LINE": data[j].col3
//           });
//         }
//       }

//       const jsonstring = JSON.stringify(shiftsBatch);
//       console.log(jsonstring);

//       try {
//         const response = await axios.post('https://192.168.2.54:443/api/saveUserShifts', jsonstring, {
//           headers: {
//             'Content-Type': 'application/json'
//           }
//         });
//         console.log(response.data);
//         setMessage('Batches Saving..');
//       } catch (error) {
//         console.error('Error saving shifts:', error);
//         setMessage('Error saving shifts. Please try again. ' + error);
//         setLoading(false); // Set loading to false on error
//         return;
//       }
//     }
//     setMessage('All shifts saved successfully');
//     setLoading(false); // Set loading to false after success
//     setTimeout(() => setMessage(''), 5000);
//   };


const handleUserSkills = async () => {
  setLoading(true);
  const batchSize = 50;
  const totalRecords = data.length;
  let allInvalidRows = [];

  const batches = [];
  for (let i = 0; i < totalRecords; i += batchSize) {
    const currentBatch = data.slice(i, i + batchSize);

    const skillsBatch = currentBatch.flatMap((item) => {
      const skills = [];
      if (item.col2 && item.col3) {
        skills.push({
          userid: item.col0,
          STAGE_NAME: item.col2.trim(),
          Skill_Description: item.col3.trim(),
          Skill_Rating: item.col4 || null,
        });
      }
      if (item.col5 && item.col6) {
        skills.push({
          userid: item.col0,
          STAGE_NAME: item.col5.trim(),
          Skill_Description: item.col6.trim(),
          Skill_Rating: item.col7 || null,
        });
      }
      if (item.col8 && item.col9) {
        skills.push({
          userid: item.col0,
          STAGE_NAME: item.col8.trim(),
          Skill_Description: item.col9.trim(),
          Skill_Rating: item.col10 || null,
        });
      }
      return skills;
    });

    if (skillsBatch.length > 0) {
      batches.push(skillsBatch);
    }
  }

  try {
    for (let i = 0; i < batches.length; i++) {
      const response = await axios.post("https://192.168.2.54:443/api/saveUserSkills", batches[i], {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data.invalidRows && response.data.invalidRows.length > 0) {
        
      

        allInvalidRows.push(...response.data.invalidRows);
      }

      setMessage(`Processed ${Math.min((i + 1) * batchSize, totalRecords)} of ${totalRecords} records...`);
      await new Promise(resolve => setTimeout(resolve, 200)); // To avoid server overload
    }

    if (allInvalidRows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(allInvalidRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Invalid Skills");
      const timestamp = new Date().toISOString().replace(/[:.-]/g, "");
      XLSX.writeFile(wb, `InvalidSkills_${timestamp}.xlsx`);
    }

    setMessage("✅ All skills saved successfully!");
  } catch (error) {
    console.error("Error saving skills:", error);
    setMessage("Error saving skills. Please try again.");
  }

  setLoading(false);
  setTimeout(() => setMessage(""), 5000);
};



  const downloadTemplate = () => {
    const link = document.createElement('a');const handleUserSkills = async () => {
  setLoading(true);
  const batchSize = 50;
  const totalRecords = data.length;

  for (let i = 0; i < totalRecords; i += batchSize) {
    const currentBatch = data.slice(i, i + batchSize);

    const shiftsBatch = currentBatch.flatMap((item) => {
      const skills = [];
      if (item.col2 && item.col3) {
        skills.push({
          userid: item.col0,
          STAGE_NAME: item.col2,
          Skill_Description: item.col3,
          Skill_Rating: item.col4 || null,
        });
      }
      if (item.col5 && item.col6) {
        skills.push({
          userid: item.col0,
          STAGE_NAME: item.col5,
          Skill_Description: item.col6,
          Skill_Rating: item.col7 || null,
        });
      }
      if (item.col8 && item.col9) {
        skills.push({
          userid: item.col0,
          STAGE_NAME: item.col8,
          Skill_Description: item.col9,
          Skill_Rating: item.col10 || null,
        });
      }
      return skills;
    });

    if (shiftsBatch.length === 0) continue;

    try {
      const response = await axios.post(
        "https://192.168.2.54:443/api/saveUserSkills",
        shiftsBatch,
        {
          headers: { "Content-Type": "application/json" },
          responseType: "blob", // Important for Excel download
        }
      );

      if (
        response.headers["content-type"] ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        const blob = new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "InvalidSkills.xlsx");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.warn("⚠️ Invalid stages found. Downloaded Excel.");
      } else {
        console.log("✅ All skills saved successfully for this batch");
      }

      setMessage(
        `Saved ${Math.min(i + batchSize, totalRecords)} of ${totalRecords} records...`
      );

      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error("Error saving skills:", error);
      setMessage("Error saving skills. Please try again. " + error);
      setLoading(false);
      return;
    }
  }

  setMessage("✅ All skills processed!");
  setLoading(false);
  setTimeout(() => setMessage(""), 5000);
};

    link.href = 'https://192.168.2.54:443/download-template-us';
    link.download = 'sample_template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tableInstance = useTable({ columns, data });

  return (
    <Container maxWidth="lg" style={{ maxWidth: '100%' }}>
      <h2 className="title">User Skills Upload</h2>
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
          <Button variant="contained" color="primary" onClick={handleUserSkills} disabled={loading}>
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
                  <th {...column.getHeaderProps()} key={column.id}>
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

export default UserSkillsUpload;
