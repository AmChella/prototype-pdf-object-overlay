import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import './DevTools.css';

const DevTools = () => {
  const { overlayData, setOverlayData, currentPage } = useAppContext();

  const [formData, setFormData] = useState({
    x: '',
    y: '',
    width: '',
    height: '',
    page: '',
    type: 'custom'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const page = formData.page ? parseInt(formData.page, 10) : currentPage;
    const x = parseFloat(formData.x);
    const y = parseFloat(formData.y);
    const width = parseFloat(formData.width);
    const height = parseFloat(formData.height);

    if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
      alert('Please enter valid numbers for coordinates and dimensions');
      return;
    }

    const newOverlay = {
      id: `dev-${Date.now()}`,
      type: formData.type,
      page: page,
      x: x,
      y: y,
      width: width,
      height: height,
      source: 'devtools'
    };

    console.log('Adding dev overlay:', newOverlay);
    setOverlayData(prev => [...prev, newOverlay]);

    // Optional: Clear form or keep for next entry
    // setFormData({ ...formData, x: '', y: '', width: '', height: '' });
  };

  const handleClearDevOverlays = () => {
    setOverlayData(prev => prev.filter(o => o.source !== 'devtools'));
  };

  return (
    <div className="devtools-container">
      <h3 className="devtools-title">DevTools: Add Overlay</h3>
      <form onSubmit={handleSubmit} className="devtools-form">
        <div className="form-group">
          <label>Page (optional):</label>
          <input
            type="number"
            name="page"
            value={formData.page}
            onChange={handleChange}
            placeholder={`Current: ${currentPage}`}
          />
        </div>
        <div className="form-row">
          <div className="form-group half">
            <label>X (pt):</label>
            <input
              type="number"
              name="x"
              value={formData.x}
              onChange={handleChange}
              required
              step="0.1"
            />
          </div>
          <div className="form-group half">
            <label>Y (pt):</label>
            <input
              type="number"
              name="y"
              value={formData.y}
              onChange={handleChange}
              required
              step="0.1"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group half">
            <label>Width (pt):</label>
            <input
              type="number"
              name="width"
              value={formData.width}
              onChange={handleChange}
              required
              step="0.1"
            />
          </div>
          <div className="form-group half">
            <label>Height (pt):</label>
            <input
              type="number"
              name="height"
              value={formData.height}
              onChange={handleChange}
              required
              step="0.1"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Type:</label>
          <select name="type" value={formData.type} onChange={handleChange}>
            <option value="custom">Custom (Gray)</option>
            <option value="table">Table (Red)</option>
            <option value="figure">Figure (Green)</option>
            <option value="para">Paragraph (Blue)</option>
          </select>
        </div>
        <div className="button-group">
          <button type="submit" className="draw-btn">Draw Overlay</button>
          <button type="button" onClick={handleClearDevOverlays} className="clear-btn">Clear Dev</button>
        </div>
      </form>
    </div>
  );
};

export default DevTools;
