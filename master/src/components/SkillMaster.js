import React, { useEffect, useState } from 'react'; 
import axios from 'axios';
import { Container, Table, InputGroup, FormControl, Button } from 'react-bootstrap';
import { TextField, Select, MenuItem, Snackbar, Typography, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MuiAlert from '@mui/material/Alert';
import '../styles/SkillMaster.css';
import emvLogo from '../pictures/emvlogo.png';


const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const SkillMaster = () => {
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState({ Skill_Description: '', Skill_Rating: '' });
  const [notification, setNotification] = useState('');
  const [editingSkill, setEditingSkill] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false); // State for toggling search bar

  const skillRatings = ['1', '2', '3', '4', '5']; // Example ratings

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get('https://192.168.2.54:443/api/skill-master');
      setSkills(response.data);
    } catch (error) {
      console.error('Error fetching skill data:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewSkill({ ...newSkill, [name]: value });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingSkill) {
      await updateSkill();
    } else {
      await addSkill();
    }
  };

  const addSkill = async () => {
    try {
      const response = await axios.post('https://192.168.2.54:443/api/skill-master', newSkill);
      setSkills([...skills, response.data]);
      setNewSkill({ Skill_Description: '', Skill_Rating: '' });
      setNotification('Skill added successfully');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error adding skill:', error);
      setNotification(error.response?.status === 409 ? 'Skill Name already exists' : 'Error adding skill');
      setSnackbarOpen(true);
    }
  };

  const updateSkill = async () => {
    try {
      const response = await axios.put(`https://192.168.2.54:443/api/skill-master/${editingSkill.Skill_id}`, newSkill);
      const updatedSkills = skills.map(skill =>
        skill.Skill_id === editingSkill.Skill_id ? response.data : skill
      );
      setSkills(updatedSkills);
      setNewSkill({ Skill_Description: '', Skill_Rating: '' });
      setEditingSkill(null);
      setNotification('Skill updated successfully');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error updating skill:', error);
      setNotification('Error updating skill');
      setSnackbarOpen(true);
    }
  };

  const editSkill = (skill) => {
    setNewSkill({ Skill_Description: skill.Skill_Description, Skill_Rating: skill.Skill_Rating });
    setEditingSkill(skill);
  };

  const cancelEdit = () => {
    setNewSkill({ Skill_Description: '', Skill_Rating: '' });
    setEditingSkill(null);
  };

  // Update the filter to match the property names
  const filteredSkills = skills.filter(skill =>
    skill.Skill_Description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const toggleSearchBar = () => {
    setShowSearchBar(!showSearchBar); // Toggle the search bar visibility
  };

  return (
    <Container fluid 
    className="container-fluid" 
    style={{ backgroundImage: `url(${emvLogo})`, backgroundSize: 'auto', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', minHeight: 'auto', opacity: '0.9' }}>
      <Typography variant="h4" align="left" gutterBottom>
        Skill Master
      </Typography>

      <form onSubmit={handleSubmit} className="form-container">
        <TextField
          label="Skill Description"
          name="Skill_Description"
          value={newSkill.Skill_Description}
          onChange={handleChange}
          className="form-input"
          required
          fullWidth
          margin="normal"
        />
        <Select
          name="Skill_Rating"
          value={newSkill.Skill_Rating}
          onChange={handleChange}
          className="form-select"
          displayEmpty
          fullWidth
          required
        >
          <MenuItem value=""><em>Select Skill Rating</em></MenuItem>
          {skillRatings.map((rating, index) => (
            <MenuItem key={index} value={rating}>
              {rating}
            </MenuItem>
          ))}
        </Select>&nbsp;
        <div className="button-group">
          <Button type="submit" variant="contained" color="primary" className="form-button">
            {editingSkill ? 'Update Skill' : 'Add Skill'}
          </Button>
          {editingSkill && (
            <Button variant="outlined" onClick={cancelEdit} className="form-button">
              Cancel
            </Button>
          )}
        </div>

        <div className="d-flex justify-content-end mb-3">
          {/* Search icon button */}
          <IconButton onClick={toggleSearchBar}>
            <SearchIcon />
          </IconButton>

          {/* Conditionally render the search bar */}
          {showSearchBar && (
            <InputGroup className="input-group" style={{ width: '600px' }}>
              <FormControl
                placeholder="Search Skill Name..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-bar"
              />
            </InputGroup>
          )}
        </div>
      </form>
      
      <Table striped bordered hover responsive className="table-container">
        <thead>
          <tr>
            <th>Skill ID</th>
            <th>Skill Name</th>
            <th>Skill Rating</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredSkills.map((skill) => (
            <tr key={skill.Skill_id}>
              <td>{skill.Skill_id}</td>
              <td>{skill.Skill_Description}</td>
              <td>{skill.Skill_Rating}</td>
              <td>
                <Button onClick={() => editSkill(skill)} variant="warning" size="sm">
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          {notification}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SkillMaster;
