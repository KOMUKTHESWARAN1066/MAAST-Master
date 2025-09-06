import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, IconButton, Menu, MenuItem, Button, Container, Box, Drawer, List, ListItem,
  ListItemText, Collapse, useMediaQuery, Typography
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HomeIcon from '@mui/icons-material/Home';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import { Link, useLocation } from 'react-router-dom';
import EmmveeLogo from '../pictures/emvlogo.png';
import styled from '@emotion/styled';
import { createTheme, ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import '../styles/HomePage.css';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import axios from 'axios';

// Simplified theme - most styling moved to CSS
import { useNavigate } from 'react-router-dom';



const theme = createTheme({
  typography: {
    fontSize: 16,
  },
});

const StyledMenuButton = styled(Button)(({ theme }) => ({
  color: '#fff',
  fontWeight: 'bold',
  padding: '10px 20px',
}));

const HomePage = () => {
  const navigate = useNavigate();
  const [token,setToken]=useState(localStorage.getItem('Token'))
  const [anchorElMaster, setAnchorElMaster] = useState(null);
  const [anchorElShift, setAnchorElShift] = useState(null);
    const [anchorElEmployee, setAnchorElEmployee] = useState(null);
  const [anchorElAtt, setAnchorElAtt] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Track animation state
  const isMobile = useMediaQuery("(max-width:600px)"); // Media query for mobile screens
  const [openMaster, setOpenMaster] = useState(false);
  const [openShift, setOpenShift] = useState(false);
  
  const [openemployee, setOpenEmployee] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const [openAtt, setOpenAtt] = useState(false);
  const AdminFlag = parseInt(sessionStorage.getItem("AdminFlag")) || 0;
const isAdmin = AdminFlag === 1;

  const location = useLocation();
// State for carousel images
  const [carouselImages, setCarouselImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [errorImages, setErrorImages] = useState('');

  useEffect(() => {
    if (location.pathname === "/home") {
      fetchCarouselImages();
    }
  }, [location.pathname]);

  const fetchCarouselImages = async () => {
    setLoadingImages(true);
    setErrorImages('');
    try {
      const response = await axios.get('https://192.168.2.54:443/api/carousel-images');
      setCarouselImages(response.data || []);
    } catch (error) {
      console.error('Error fetching carousel images:', error);
      setErrorImages('Failed to load images. Please try again later.');
      setCarouselImages([]);
    } finally {
      setLoadingImages(false);
    }
  };
  const handleOpenMasterMenu = (event) => {
    setAnchorElMaster(event.currentTarget);
  };

  const handleOpenEmployeeMenu = (event) => {
    setAnchorElEmployee(event.currentTarget);
  };

  const handleOpenShiftMenu = (event) => {
    setAnchorElShift(event.currentTarget);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };
const handleLogout = () => {
  
  // Clear all storage
  sessionStorage.clear();
  localStorage.clear();
  setToken(null)

  // Redirect to home
  navigate('/login', { replace: true });
};
  const handleOpenAttMenu = (event) => {
    setAnchorElAtt(event.currentTarget);
  };

  const handleCloseMasterMenu = () => {
    setAnchorElMaster(null);
  };

  const handleCloseShiftMenu = () => {
    setAnchorElShift(null);
  };

  const handleCloseAttMenu = () => {
    setAnchorElAtt(null);
  };

    const handleCloseEmployeeMenu = () => {
    setAnchorElEmployee(null);
  };
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
    setIsMenuOpen(!isMenuOpen); // Toggle the menu icon state for animation
  };

  // Toggle the "Master" section
  const handleToggleMaster = () => {
    setOpenMaster(!openMaster);
  };

  // Toggle the "User Shift Roster" section
  const handleToggleShift = () => {
    setOpenShift(!openShift);
  };

   const handleToggleemployee = () => {
    setOpenEmployee(!openemployee);
  };

  const handleToggleUser = () => {
    setOpenUser(!openUser);
  };

  const handleToggleAtt = () => {
    setOpenAtt(!openAtt);
  };
  
const defaultCarouselContent = [
    {
      id: 'default-1',
      type: 'logo',
      content: EmmveeLogo,
      title: 'Welcome to Emmvee'
    }
  ];

  return (
    <>
     {token && (
      <>
       <ThemeProvider theme={theme}>
        <AppBar position="static" class="app-bar">
          <Container maxWidth="xl">
            <Toolbar
              disableGutters
              sx={{
                justifyContent: "space-between",
                flexWrap: isMobile ? "wrap" : "nowrap",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <IconButton
                  edge="start"
                  color="inherit"
                  aria-label="logo"
                  component={Link}
                  to="/home"
                >
                  <img src={EmmveeLogo} alt="Logo" class="logo" />
                </IconButton>
                <StyledMenuButton
                  component={Link}
                  to="/home"
                  startIcon={<HomeIcon />}
                >
                  Home
                </StyledMenuButton>
              </Box>

              {!isMobile ? (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                
                  {isAdmin &&(
<>

 <StyledMenuButton
                    onClick={handleOpenMasterMenu}
                    aria-controls="master-menu"
                    aria-haspopup="true"
                    endIcon={<ExpandMoreIcon />}
                  >
                    Master
                  </StyledMenuButton>
                  
                  <Menu
                    id="master-menu"
                    anchorEl={anchorElMaster}
                    open={Boolean(anchorElMaster)}
                    onClose={handleCloseMasterMenu}
                  >
                    
                  
                      <MenuItem
                      onClick={() => {
                        handleCloseMasterMenu();
                      }}
                      component={Link}
                      to="/stage-master"
                    >
                      Stage Master
                    </MenuItem>



                     
                    <MenuItem
                      onClick={() => {
                        handleCloseMasterMenu();
                      }}
                      component={Link}
                      to="/skill-master"
                    >
                      Skill Master
                    </MenuItem>
                    
                     <MenuItem
                      onClick={() => {
                        handleCloseMasterMenu();
                      }}
                      component={Link}
                      to="/User-Master"
                    >
                      User Login
                    </MenuItem>


                                        <MenuItem
                      onClick={() => {
                        handleCloseMasterMenu();
                      }}
                      component={Link}
                      to="/image-upload"
                    >
                      Upload Image
                    </MenuItem>
                  
                   

                    {/* <MenuItem
                      onClick={() => {
                        handleCloseMasterMenu();
                      }}
                      component={Link}
                      to="/employee-history"
                    >
                      Employee History
                    </MenuItem>

                    <MenuItem
                      onClick={() => {
                        handleCloseMasterMenu();
                      }}
                      component={Link}
                      to="/employee-Punctuality"
                    >
                      Employee Punctuality
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleCloseMasterMenu();
                      }}
                      component={Link}
                      to="/NPunchReport"
                    >
                      N Punch Report
                    </MenuItem>

                    <MenuItem
                      onClick={() => {
                        handleCloseMasterMenu();
                      }}
                      component={Link}
                      to="/employee-jobcardupload"
                    >
                      Employee Job Card Upload
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleCloseMasterMenu();
                      }}
                      component={Link}
                      to="/employee-jobcarddownload"
                    >
                      Employee Job Card Report
                    </MenuItem> */}
                   
                  </Menu>

                  
</>


                  )}

                 <StyledMenuButton
                    onClick={handleOpenEmployeeMenu}
                    aria-controls="user-menu"
                    aria-haspopup="true"
                    endIcon={<ExpandMoreIcon />}
                  >
                    Employee Report
                  </StyledMenuButton>

                  <Menu
                   id="employee-menu"
                    anchorEl={anchorElEmployee}
                    open={Boolean(anchorElEmployee)}
                    onClose={handleCloseEmployeeMenu}
                  >

                    
                    <MenuItem
                      onClick={() => {
                        handleCloseEmployeeMenu();
                      }}
                      component={Link}
                      to="/employee-history"
                    >
                      Employee History
                    </MenuItem>

                    <MenuItem
                      onClick={() => {
                        handleCloseEmployeeMenu();
                      }}
                      component={Link}
                      to="/employee-Punctuality"
                    >
                      Employee Punctuality
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleCloseEmployeeMenu();
                      }}
                      component={Link}
                      to="/NPunchReport"
                    >
                      N Punch Report
                    </MenuItem>

                    <MenuItem
                      onClick={() => {
                        handleCloseEmployeeMenu();
                      }}
                      component={Link}
                      to="/employee-jobcardupload"
                    >
                      Employee Job Card Upload
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleCloseEmployeeMenu();
                      }}
                      component={Link}
                      to="/employee-jobcarddownload"
                    >
                      Employee Job Card Report
                    </MenuItem>
                   
                  </Menu>
                    
                  {/* <StyledMenuButton component={Link} to="/user-skills">User Skills</StyledMenuButton> */}
                   {isAdmin &&(
                      <>
                      
                  <StyledMenuButton
                    onClick={handleOpenUserMenu}
                    aria-controls="user-menu"
                    aria-haspopup="true"
                    endIcon={<ExpandMoreIcon />}
                  >
                    User Skills Roster
                  </StyledMenuButton>
                  <Menu
                    id="user-menu"
                    anchorEl={anchorElUser}
                    open={Boolean(anchorElUser)}
                    onClose={handleCloseUserMenu}
                  >
                    <MenuItem
                      onClick={() => {
                        handleCloseUserMenu();
                      }}
                      component={Link}
                      to="/user-skills-upload"
                    >
                      User Skills Upload
                    </MenuItem>
                  
                      <MenuItem
                      onClick={() => {
                        handleCloseUserMenu();
                      }}
                      component={Link}
                      to="/user-skills"
                    >
                      User Skills Report
                    </MenuItem>
                  
                 
                    </Menu>
                     </>
                    )}

                  <StyledMenuButton
                    onClick={handleOpenShiftMenu}
                    aria-controls="shift-menu"
                    aria-haspopup="true"
                    endIcon={<ExpandMoreIcon />}
                  >
                    User Shift Roster
                  </StyledMenuButton>
                  <Menu
                    id="shift-menu"
                    anchorEl={anchorElShift}
                    open={Boolean(anchorElShift)}
                    onClose={handleCloseShiftMenu}
                  >
                    <MenuItem
                      onClick={() => {
                        handleCloseShiftMenu();
                      }}
                      component={Link}
                      to="/user-shift-upload"
                    >
                      User Shift Upload
                    </MenuItem>
                    {isAdmin &&(
                      <>
                      <MenuItem
                      onClick={() => {
                        handleCloseShiftMenu();
                      }}
                      component={Link}
                      to="/user-shift-report"
                    >
                      User Shift Report
                    </MenuItem>
                      </>
                    )}
                  </Menu>

                  <StyledMenuButton
                    onClick={handleOpenAttMenu}
                    aria-controls="att-menu"
                    aria-haspopup="true"
                    endIcon={<ExpandMoreIcon />}
                  >
                    Attendance
                  </StyledMenuButton>
                  <Menu
                    id="att-menu"
                    anchorEl={anchorElAtt}
                    open={Boolean(anchorElAtt)}
                    onClose={handleCloseAttMenu}
                  >
                    <MenuItem
                      onClick={() => {
                        handleCloseAttMenu();
                      }}
                      component={Link}
                      to="/attendance"
                    >
                      {" "}
                      Attendance Report
                    </MenuItem>
                    {isAdmin &&(
                      <>
                      <MenuItem
                      onClick={() => {
                        handleCloseAttMenu();
                      }}
                      component={Link}
                      to="/summary"
                    >
                      Summary Report
                    </MenuItem>
                 
                      </>
                    )}
                    
                     </Menu>

                  <StyledMenuButton
  onClick={handleLogout}
  startIcon={<PowerSettingsNewIcon />}
  sx={{
    mx: 1,
    backgroundColor: "#e53935",
    "&:hover": { backgroundColor: "#d32f2f" },
  }}
>
  Logout
</StyledMenuButton>

                </Box>
              ) : (
                <IconButton
                  edge="end"
                  onClick={toggleDrawer(true)}
                  class={`menu-button ${isMenuOpen ? "open" : ""}`} // Add class for animation
                >
                  {/* Animate between MenuIcon and CloseIcon */}
                  {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
                </IconButton>
              )}
            </Toolbar>
          </Container>
        </AppBar>

        {/* Mobile Drawer */}
        <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
          <List>
            {/* Close Drawer Button */}
            <ListItem>
              <IconButton
                onClick={toggleDrawer(false)}
                className="close-icon"
                sx={{ marginLeft: "auto", color: "#000" }}
              >
                <CloseIcon />
              </IconButton>
            </ListItem>

            {/* Home Link */}
            <ListItem button component={Link} to="/home">
              <ListItemText primary="Home" />
            </ListItem>
{isAdmin &&(
                <>
            {/* Expandable Master Section */}
        
             <ListItem button onClick={handleToggleMaster}>
              <ListItemText primary="Master" />
              {openMaster ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItem>
            <Collapse in={openMaster} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
               
                 <ListItem
                  button
                  component={Link}
                  to="/stage-master"
                  sx={{ pl: 4 }}
                >
                  <ListItemText primary="Stage Master" />
                </ListItem>
                
<ListItem
                  button
                  component={Link}
                  to="/skill-master"
                  sx={{ pl: 4 }}
                >
                  <ListItemText primary="Skill Master" />
                </ListItem>

                 <ListItem
                  button
                  component={Link}
                  to="/User-Master"
                  sx={{ pl: 4 }}
                >
                  <ListItemText primary="User Login" />
                </ListItem>
            
                
                <ListItem
                  button
                  component={Link}
                  to="/image-upload"
                  sx={{ pl: 4 }}
                >
                  
                  <ListItemText primary="Upload Image" />
                </ListItem>
                
              
                
               
              </List>
            </Collapse>
              </>
               )}
          <ListItem button onClick={handleToggleemployee}>
              <ListItemText primary="Employee Report" />
              {openemployee ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItem>
            <Collapse in={openemployee} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                 <ListItem
                  button
                  component={Link}
                  to="/employee-history"
                  sx={{ pl: 4 }}
                >
                  <ListItemText primary="Employee History" />
                </ListItem>

                
                <ListItem
                  button
                  component={Link}
                  to="/employee-Punctuality"
                  sx={{ pl: 4 }}
                >
                  <ListItemText primary="Employee Punctuality" />
                </ListItem>
                
                 <ListItem
                  button
                  component={Link}
                  to="/NPunchReport"
                  sx={{ pl: 4 }}
                >
                  <ListItemText primary="N Punch Report" />
                </ListItem>



                <ListItem
                  button
                  component={Link}
                  to="/employee-jobcardupload"
                  sx={{ pl: 4 }}
                >
                  <ListItemText primary=" Employee Job Card Upload" />
                </ListItem>
                <ListItem
                  button
                  component={Link}
                  to="/employee-jobcarddownload"
                  sx={{ pl: 4 }}
                >
                  <ListItemText primary="Employee Job Card Report" />
                </ListItem>
                </List>
                
            </Collapse>
           {isAdmin &&(
            <>
 <ListItem button onClick={handleToggleUser}>
              <ListItemText primary="User Skills" />
              {openUser ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItem>
            <Collapse in={openUser} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {/* User Skills Link */}
                <ListItem button component={Link} to="/user-skills">
                  <ListItemText primary="User Skills Roaster" />
                </ListItem>
                <ListItem button component={Link} to="/user-skills-upload">
                  <ListItemText primary="User Skills Upload" />
                </ListItem>
              </List>
            </Collapse>

            </>
           )}
            {/* Expandable User Shift Roster Section */}
            <ListItem button onClick={handleToggleShift}>
              <ListItemText primary="User Shift Roster" />
              {openShift ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItem>
            <Collapse in={openShift} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItem
                  button
                  component={Link}
                  to="/user-shift-upload"
                  sx={{ pl: 4 }}
                >
                  <ListItemText primary="User Shift Upload" />
                </ListItem>
                {isAdmin &&(
                  <>
                  <ListItem
                  button
                  component={Link}
                  to="/user-shift-report"
                  sx={{ pl: 4 }}
                >
                  <ListItemText primary="User Shift Report" />
                </ListItem>
                  </>

                )}
              </List>
            </Collapse>

            {/* Attendance Link */}
            <ListItem button onClick={handleToggleAtt}>
              <ListItemText primary="Attendance" />
              {openAtt ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItem>
            <Collapse in={openAtt} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {/* Attendance Link */}
                <ListItem button component={Link} to="/attendance">
                  <ListItemText primary="Attendance" />
                </ListItem>
               {isAdmin &&(
                <>
                 <ListItem button component={Link} to="/summary">
                  <ListItemText primary="Summary" />
                </ListItem>
                </>
               )}
              </List>
            </Collapse>
            
            {/* Logout Link */}
            <ListItem button component={Link} to="/login">
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </Drawer>

        {/* Carousel Section */}
        {location.pathname === "/home" && (
          <Box sx={{ width: "100%", mt: 5 }}>
            {loadingImages ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6">Loading carousel images...</Typography>
              </Box>
            ) : errorImages ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="error">
                  {errorImages}
                </Typography>
                <Button
                  variant="contained"
                  onClick={fetchCarouselImages}
                  sx={{ mt: 2 }}
                >
                  Retry
                </Button>
              </Box>
            ) : carouselImages.length > 0 ? (
              <Carousel
                showArrows={!isMobile}
                showThumbs={false}
                infiniteLoop={true}
                autoPlay={true}
                interval={4000}
                transitionTime={1000}
                stopOnHover={true}
                showStatus={true}
                showIndicators={true}
                renderArrowPrev={(onClickHandler, hasPrev) =>
                  hasPrev && !isMobile && (
                    <button
                      type="button"
                      onClick={onClickHandler}
                      className="custom-prev-arrow"
                    >
                      &#8249;
                    </button>
                  )
                }
                renderArrowNext={(onClickHandler, hasNext) =>
                  hasNext && !isMobile && (
                    <button
                      type="button"
                      onClick={onClickHandler}
                      className="custom-next-arrow"
                    >
                      &#8250;
                    </button>
                  )
                }
              >
                {carouselImages.map((image, index) => (
  <div key={image.id} className="carouselslide">
    <div className="image-container">
      <img
        src={image.image_data}
        alt={image.image_name}
        className="carousel-image"
      />
      <div className="image-name-overlay">
        {image.image_name}
      </div>
    </div>
    <p className="legend" style={{ display: 'none' }}>{image.image_name}</p>
  </div>
))}

              </Carousel>
            ) : (
              <Carousel
                showArrows={false}
                showThumbs={false}
                infiniteLoop={false}
                autoPlay={false}
                showStatus={false}
                showIndicators={false}
                swipeable={false}
                emulateTouch={false}
              >
                {defaultCarouselContent.map((item) => (
                  <div key={item.id} className="carouselslide">
                    <img
                      src={item.content}
                      alt={item.title}
                      className="carousel-image"
                    />
                    <p className="legend">{item.title}</p>
                  </div>
                ))}
              </Carousel>
            )}
          </Box>
        )}
      </ThemeProvider>

      </>
     )}
      <style>{`
 

      `}</style>
    </>
  );
};

export default HomePage;
