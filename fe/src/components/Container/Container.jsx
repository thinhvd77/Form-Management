import React from 'react';
import './Container.css';

const Container = ({ 
  children, 
  maxWidth = 'default', 
  padding = 'default',
  className = '',
  as: Component = 'div' 
}) => {
  const containerClass = [
    'container',
    `container-${maxWidth}`,
    `container-padding-${padding}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <Component className={containerClass}>
      {children}
    </Component>
  );
};

export default Container;
