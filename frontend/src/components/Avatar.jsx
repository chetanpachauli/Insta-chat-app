import React, { useState } from 'react';
import PropTypes from 'prop-types';

const sizeMap = {
  'xs': { size: 24, text: 'text-xs' },
  'sm': { size: 32, text: 'text-sm' },
  'md': { size: 40, text: 'text-base' },
  'lg': { size: 48, text: 'text-lg' },
  'xl': { size: 56, text: 'text-xl' },
};

function Avatar({ user = {}, size = 'md', className = '' }) {
  const [imageError, setImageError] = useState(false);
  
  // Handle both string and number sizes
  const sizeInfo = typeof size === 'string' 
    ? (sizeMap[size.toLowerCase()] || sizeMap['md']) 
    : { size: Number(size) || sizeMap['md'].size, text: 'text-base' };

  const style = { 
    width: `${sizeInfo.size}px`, 
    height: `${sizeInfo.size}px`,
    minWidth: `${sizeInfo.size}px`,
    minHeight: `${sizeInfo.size}px`,
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const renderFallback = () => {
    const label = (user?.username || user?.name || 'User')[0]?.toUpperCase() || 'U';
    return (
      <div 
        style={style} 
        className={`rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold ${sizeInfo.text} ${className}`}
      >
        {label}
      </div>
    );
  };

  const imageUrl = user?.profilePic || user?.avatar;
  
  if (!imageUrl || imageError) {
    return renderFallback();
  }

  // Check if the URL is valid
  try {
    new URL(imageUrl);
  } catch (e) {
    return renderFallback();
  }

  return (
    <img 
      src={imageUrl}
      alt={user?.username || user?.name || 'avatar'}
      onError={handleImageError}
      style={style}
      className={`rounded-full object-cover ${className}`}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

Avatar.propTypes = {
  user: PropTypes.shape({
    profilePic: PropTypes.string,
    avatar: PropTypes.string,
    username: PropTypes.string,
    name: PropTypes.string,
  }),
  size: PropTypes.oneOfType([
    PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
    PropTypes.number,
    PropTypes.string,
  ]),
  className: PropTypes.string,
};

export default Avatar;
