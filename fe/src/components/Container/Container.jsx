import React from 'react';
import './Container.css';

const Container = ({ 
  children, 
  maxWidth = 'default', 
  padding = 'default',
  className = '',
  as = 'div' 
}) => {
  const containerClass = [
    'container',
    `container-${maxWidth}`,
    `container-padding-${padding}`,
    className
  ].filter(Boolean).join(' ');

  const TagName = as;
  return (
    <TagName className={containerClass}>
      {children}
    </TagName>
  );
};

export default Container;
