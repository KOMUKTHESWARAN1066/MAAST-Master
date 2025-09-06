import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Typography,
  TextField,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Edit,
  DragIndicator
} from '@mui/icons-material';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const ImageUpload = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editDialog, setEditDialog] = useState({ open: false, image: null });

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await axios.get('https://192.168.2.54:443/api/carousel-images');
      setImages(response.data);
    } catch (error) {
      console.error('Error fetching images:', error);
      setError('Failed to fetch images');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 1 * 1024 * 1024) {
      setError('File size must be less than 1MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('displayOrder', images.length);

    try {
      await axios.post('https://192.168.2.54:443/api/carousel-images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('Image uploaded successfully!');
      fetchImages(); // Refresh the image list
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(error.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    try {
      await axios.delete(`https://192.168.2.54:443/api/carousel-images/${id}`);
      setSuccess('Image deleted successfully!');
      fetchImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      setError('Failed to delete image');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setImages(items);

    // Update display orders in the database
    try {
      const updatePromises = items.map((item, index) =>
        axios.put(`https://192.168.2.54:443/api/carousel-images/${item.id}/order`, {
          displayOrder: index
        })
      );
      
      await Promise.all(updatePromises);
      setSuccess('Image order updated successfully!');
    } catch (error) {
      console.error('Error updating image order:', error);
      setError('Failed to update image order');
      fetchImages(); // Revert changes
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Carousel Image Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Upload Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Upload New Image
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUpload />}
              disabled={uploading}
            >
              Choose Image
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileUpload}
              />
            </Button>
            
            {uploading && (
              <Box sx={{ flexGrow: 1 }}>
                <LinearProgress />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Uploading...
                </Typography>
              </Box>
            )}
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Supported formats: JPEG, PNG, GIF, WebP (Max size: 1MB)
          </Typography>
        </CardContent>
      </Card>

      {/* Images Grid */}
      {loading ? (
        <LinearProgress />
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="images">
            {(provided) => (
              <Grid
                container
                spacing={3}
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {images.map((image, index) => (
                  <Draggable
                    key={image.id}
                    draggableId={image.id.toString()}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        md={4}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        <Card
                          sx={{
                            transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                            opacity: snapshot.isDragging ? 0.8 : 1,
                          }}
                        >
                          <Box sx={{ position: 'relative' }}>
                            <CardMedia
                              component="img"
                              height="200"
                              image={image.image_data}
                              alt={image.image_name}
                              sx={{ objectFit: 'cover' }}
                            />
                            
                            <IconButton
                              {...provided.dragHandleProps}
                              sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                '&:hover': {
                                  backgroundColor: 'rgba(0,0,0,0.7)',
                                }
                              }}
                            >
                              <DragIndicator />
                            </IconButton>
                          </Box>
                          
                          <CardContent>
                            <Typography variant="subtitle1" noWrap>
                              {image.image_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Size: {formatFileSize(image.file_size)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Order: {index + 1}
                            </Typography>
                            
                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                              <IconButton
                                color="error"
                                onClick={() => handleDeleteImage(image.id)}
                              >
                                <Delete />
                              </IconButton>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Grid>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {images.length === 0 && !loading && (
        <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
          No images uploaded yet. Upload your first image to get started!
        </Typography>
      )}
    </Box>
  );
};

export default ImageUpload;
