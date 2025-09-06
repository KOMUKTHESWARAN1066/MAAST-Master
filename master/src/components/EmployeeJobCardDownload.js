import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Table,
  Button,
  Form,
  Spinner,
  Alert,
} from "react-bootstrap";
import axios from "axios";
import { DateTime } from "luxon";
import * as XLSX from "xlsx";

const EmployeeJobCardDownload = () => {
  const [employeeName, setEmployeeName] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [JobDataData, setJobDataData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [employeeId,setEmployeeid]=useState()
  const [fromDate, setFromDate] = useState("");
const [toDate, setToDate] = useState("");



function formatDateforbackend(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}



const formatDates = (dateStr) => {
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

  useEffect(() => {
    // Fetch employee list for dropdown
const fetchEmployees = async () => {
  try {
    const res = await axios.get("https://192.168.2.54:443/api/employees");

    if (Array.isArray(res.data)) {
      setEmployeeOptions(res.data); // keep objects [{ name, userid }]
    }
  } catch (err) {
    console.error("Error fetching employee list:", err);
  }
};


    fetchEmployees();
  }, []);

const fetchJobData = async () => {
  if (!employeeId) {
    setError("Please select an employee.");
    return;
  }
  if (!fromDate || !toDate) {
    setError("Please select an Month.");
    return;
  }
  


  setError("");
  setLoading(true);

  try {
    const response = await axios.post(
      "https://192.168.2.54:443/api/employee-Jobreport",
      {
        fromDate: formatDateforbackend(fromDate),
        toDate: formatDateforbackend(toDate),
        employeeId: employeeId, // ✅ send employeeId instead of name
      },
      { timeout: 330000 }
    );

    if (response.data && Array.isArray(response.data.records)) {
      setJobDataData(response.data.records);
    
      if (response.data.records.length === 0) {
        setError("No JobData found for the selected filters.");
      }
    } else {
      setError("Invalid response format from server.");
    }
  } catch (error) {
    console.error("Error fetching Employee Job Card Data:", error);
    if (error.code === "ECONNABORTED") {
      setError("Request timeout. Please try again.");
    } else if (error.response) {
      setError(
        `Server error: ${error.response.data || error.response.statusText}`
      );
    } else if (error.request) {
      setError("Network error. Please check your connection.");
    } else {
      setError("An unexpected error occurred. Please try again.");
    }
    setJobDataData([]);
  } finally {
    setLoading(false);
  }
};




const downloadExcel = () => {
  if (!Array.isArray(JobDataData) || JobDataData.length === 0) {
    setError("No JobData data to export.");
    return;
  }

  try {
    // Calculate totals for numeric columns
    const totalTarget = JobDataData.reduce((sum, item) => sum + (item.Target || 0), 0);
    const totalActual = JobDataData.reduce((sum, item) => sum + (item.Actual || 0), 0);
    const totalPerformance = JobDataData.reduce((sum, item) => sum + (item.Performance || 0), 0);
    const totalAttendance = JobDataData.reduce((sum, item) => sum + (item.Attendance || 0), 0);
    const totalPunctuality = JobDataData.reduce((sum, item) => sum + (item.Punctuality || 0), 0);
    const totalRejections = JobDataData.reduce((sum, item) => sum + (item.Rejections || 0), 0);
    const total5S = JobDataData.reduce((sum, item) => sum + (item["5S"] || 0), 0);
    const totalPPE = JobDataData.reduce((sum, item) => sum + (item.PPE || 0), 0);
    const totalDiscipline = JobDataData.reduce((sum, item) => sum + (item.Disclipline || 0), 0);
    const totalTotal = JobDataData.reduce((sum, item) => sum + (item.Total || 0), 0);

    const worksheetData = [
      ["Employee Job Card Data"],
      ["NAME:", employeeName, ""],
      ["ID NO.", employeeId || "", "", "", ""],
      [],
      ["SL NO.","DATE","SHIFT","STAGE","LINE","Target","Actual","Production Performance","Attendance","Punctuality","Rejections","5S","Safety & PPE Usage","Discipline","Total"],
      ...JobDataData.map((item, index) => [
        index + 1,
        formatDates(item.Date),
        item.SHIFTNAME || "",
        item.STAGE || "",
        item.LINE || "",
        item.Target || 0,
        item.Actual || 0,
        item.Performance || 0,
        item.Attendance || 0,
        item.Punctuality || 0,
        item.Rejections || 0,
        item["5S"] || 0,
        item.PPE || 0,
        item.Disclipline || 0,
        item.Total || 0,
      ]),
      // ✅ Add Total Row
      ["", "", "", "", "TOTAL",
        "", "", "", "", "",
        "", "", "", "", totalTotal
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Merge title
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } } // adjust merge based on last column
    ];

    // Set column widths
    worksheet["!cols"] = Array(15).fill({ wch: 15 });

    // Apply styles
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for(let R = range.s.r; R <= range.e.r; ++R) {
      for(let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = { c: C, r: R };
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        const cell = worksheet[cell_ref];
        if(cell) {
          // Title row
          if(R === 0) {
            cell.s = {
              font: { name: "Arial", sz: 14, bold: true },
              fill: { fgColor: { rgb: "FFFF00" } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
          // Header row
          else if(R === 4) {
            cell.s = {
              font: { name: "Arial", sz: 10, bold: true },
              fill: { fgColor: { rgb: "D9E1F2" } },
              alignment: { horizontal: "center", vertical: "center" },
              border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
            };
          }
          // Total row
          else if(R === range.e.r) {
            cell.s = {
              font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "4472C4" } }, // Dark Blue background
              alignment: { horizontal: "center", vertical: "center" },
              border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
            };
          }
          // Normal cells
          else {
            cell.s = {
              font: { name: "Arial", sz: 10 },
              alignment: { horizontal: "center", vertical: "center" },
              border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
            };
          }
        }
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Job Card Data");

    const fileName = `EmployeeJobCardDownload__${employeeName}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    setError("");
  } catch (error) {
    console.error("Error downloading Excel:", error);
    setError("Failed to download Excel file. Please try again.");
  }
};



  const resetFilters = () => {
    setEmployeeName("");
    setJobDataData([]);
    setError("");
  };

  return (
    <Container className="mt-4">
      <h2 className="mb-3">Employee Job Card Data</h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Row className="mb-3">
     
       
        <Col md={4}>
        <Form.Label>Employee *</Form.Label>
<Form.Select
  className="form-select"
  value={employeeId}
  onChange={(e) => {
    const selectedIndex = e.target.selectedIndex;
    const selectedEmp = employeeOptions[selectedIndex - 1]; // because index 0 is "Select Employee"
    setEmployeeid(e.target.value);
    if (selectedEmp) {
      setEmployeeName(selectedEmp.name);
    }
  }}
>
  <option value="">Select Employee</option>
  {employeeOptions.map((emp, idx) => (
    <option key={idx} value={emp.userid}>
      {emp.userid} ({emp.name})
    </option>
  ))}
</Form.Select>


        </Col>

        <Col md={4}>
          <Form.Label>Select Month *</Form.Label>
<Form.Label>Select Month *</Form.Label>
<Form.Control
  type="month"
  className="form-control"
  value={fromDate ? fromDate.slice(0, 7) : ""}
  onChange={(e) => {
    const [year, month] = e.target.value.split("-");
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-${new Date(year, month, 0).getDate()}`; 
    setFromDate(startDate); // yyyy-mm-dd
    setToDate(endDate);     // yyyy-mm-dd
  }}
  max={new Date().toISOString().slice(0, 7)}
/>


        </Col>

       
      </Row>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <Button onClick={fetchJobData} disabled={loading} className="me-2">
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Loading...
              </>
            ) : (
              "Show JobData"
            )}
          </Button>
          <Button variant="outline-secondary" onClick={resetFilters}>
            Reset Filters
          </Button>
        </div>

        {JobDataData.length > 0 && (
          <Button variant="success" onClick={downloadExcel}>
            📥 Download Excel
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
          <p className="mt-2">Loading employee ...</p>
        </div>
      ) : JobDataData.length > 0 ? (
        <>
          <Table striped bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Stage</th>
                <th>Line</th>
                <th>Target</th>
                <th>Actual</th>
                <th>Performance</th>
                <th>Attendence</th>
                <th>Punctuality</th>
                <th>Rejections</th>
                <th>5S</th>
                <th>Safety & PPE Usage</th>
                <th>Discipline</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {JobDataData.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
            <td>{formatDates(item.Date)}</td>
            <td>{item.SHIFTNAME || "N/A"}</td>
            <td>{item.STAGE || "N/A"}</td>
            <td>{item.LINE || "N/A"}</td>
            <td>{item.Target || 0}</td>
            <td>{item.Actual || 0}</td>
            <td>{item.Performance || 0}</td>
            <td>{item.Attendance || 0}</td>
            <td>{item.Punctuality || 0}</td>
            <td>{item.Rejections || 0}</td>
            <td>{item["5S"] || 0}</td>
            <td>{item.PPE || 0}</td>
            <td>{item.Disclipline || 0}</td>
            <td>{item.Total || 0}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-muted">
            No Employee  data found. Please select your filters 
          </p>
        </div>
      )}
    </Container>
  );
};

export default EmployeeJobCardDownload;
