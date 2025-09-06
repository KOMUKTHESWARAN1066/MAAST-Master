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

const EmployeeHistory = () => {
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [employeeName, setEmployeeName] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [employeeId,setEmployeeid]=useState()
  const [Pagination,setPagination]=useState([])
const formatDate = (date) => {
  if (!date) return ""; // avoid invalid value
  const d = new Date(date);
  if (isNaN(d.getTime())) return ""; // handle invalid date
  return d.toISOString().split("T")[0]; // yyyy-MM-dd
}
const formatDateforexcel = (date) => {
  if (!date) return ""; // avoid invalid value
  const d = new Date(date);
  if (isNaN(d.getTime())) return ""; // handle invalid date
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0'); // getMonth() returns 0-11
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`; // dd-mm-yyyy
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
const fetchHistory = async () => {
  if (!fromDate || !toDate) {
    setError("Please select both From and To dates.");
    return;
  }
  if (!employeeId) {
    setError("Please select an employee.");
    return;
  }

  setError("");
  setLoading(true);

  try {
    const response = await axios.post(
      "https://192.168.2.54:443/api/employee-history",
      {
        fromDate: formatDate(fromDate),
        toDate: formatDate(toDate),
        employeeId: employeeId, // ✅ send employeeId instead of name
      },
      { timeout: 330000 }
    );
    console.log("fromdate",fromDate)
    
    if (response.data && Array.isArray(response.data.records)) {
      setHistoryData(response.data.records);
      console.log(EmployeeHistory)
      if (response.data.records.length === 0) {
        setError("No history found for the selected filters.");
      }
    } else {
      setError("Invalid response format from server.");
    }
  } catch (error) {
    console.error("Error fetching employee history:", error);
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
    setHistoryData([]);
  } finally {
    setLoading(false);
  }
};


const downloadExcel = () => {
  if (!Array.isArray(historyData) || historyData.length === 0) {
    setError("No history data to export.");
    return;
  }

  try {
    const worksheetData = [
      ["EMPLOYEE HISTORY"], // Main title
      ["NAME: ",employeeName, "",  "DATE:","FROM", formatDateforexcel(fromDate)],
      ["ID NO.", employeeId || "", "","", "TO",formatDateforexcel(toDate)], // You can pass employeeId
      [], // Empty row
      ["SL NO.", "DATE", "SHIFT", "LINE", "STAGE", "ATTENDANCE", "PUNCTUALITY"], // Table Header
      ...historyData.map((item, index) => [
        index + 1,
        formatDatefordisplay(item.DATE)
         ,
        item.SHIFT || "",
        item.LINE || "",
        item.STAGE || "",
        item.ATTENDANCE || "",
        item.PUNCTUALITY || "",
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Merge cells for title and headers
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // EMPLOYEE HISTORY merged across 7 columns
    ];

    // Set column widths
    worksheet["!cols"] = [
      { wch: 8 }, // SL NO.
      { wch: 12 }, // DATE
      { wch: 15 }, // SHIFT
      { wch: 12 }, // LINE
      { wch: 15 }, // STAGE
      { wch: 15 }, // ATTENDANCE
      { wch: 20 }, // PUNCTUALITY
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee History");

    const fileName = `EmployeeHistory_${formatDate(fromDate)}_${formatDate(
      toDate
    )}_${employeeName}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    setError("");
  } catch (error) {
    console.error("Error downloading Excel:", error);
    setError("Failed to download Excel file. Please try again.");
  }
};

  const resetFilters = () => {
    setFromDate(new Date());
    setToDate(new Date());
    setEmployeeName("");
    setHistoryData([]);
    setError("");
  };

  return (
    <Container className="mt-4">
      <h2 className="mb-3">Employee History</h2>

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
          <Form.Label>From Date *</Form.Label>
          <Form.Control
            type="date"
            className="form-control"
            value={formatDate(fromDate)}
            onChange={(e) => setFromDate(new Date(e.target.value))}
            max={formatDate(new Date())}
          />
        </Col>

        <Col md={4}>
          <Form.Label>To Date *</Form.Label>
          <Form.Control
            type="date"
            className="form-control"
            value={formatDate(toDate)}
            onChange={(e) => setToDate(new Date(e.target.value))}
            max={formatDate(new Date())}
          />
        </Col>

        
      </Row>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <Button onClick={fetchHistory} disabled={loading} className="me-2">
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
              "Show History"
            )}
          </Button>
          <Button variant="outline-secondary" onClick={resetFilters}>
            Reset Filters
          </Button>
        </div>

        {historyData.length > 0 && (
          <Button variant="success" onClick={downloadExcel}>
            📥 Download Excel
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
          <p className="mt-2">Loading employee history...</p>
        </div>
      ) : historyData.length > 0 ? (
        <>
          <Table striped bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Line</th>
                <th>Stage</th>
                <th>Attendance</th>
                <th>Punctuality</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                 <td>{formatDatefordisplay(item.DATE)}</td>

                  <td>{item.SHIFT || "N/A"}</td>
                  <td>{item.LINE || "N/A"}</td>
                  <td>{item.STAGE || "N/A"}</td>
                  <td>{item.ATTENDANCE || "N/A"}</td>
                  <td>{item.PUNCTUALITY || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-muted">
            No employee history data found. Please select your filters and click
            "Show History" to view data.
          </p>
        </div>
      )}
    </Container>
  );
};

export default EmployeeHistory;
