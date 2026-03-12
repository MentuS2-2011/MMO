import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import './PageTransition.css'

const PageTransition = ({ children }) => {
  const location = useLocation()

  useEffect(() => {
    document.body.classList.add('page-transition-enter')
    
    const timer = setTimeout(() => {
      document.body.classList.remove('page-transition-enter')
    }, 300)

    return () => {
      clearTimeout(timer)
      document.body.classList.add('page-transition-exit')
    }
  }, [location])

  return children
}

export default PageTransition