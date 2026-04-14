import { useEffect, useRef } from 'react'

export function useReveal() {
  const ref = useRef(null)
  
  useEffect(() => {
    const el = ref.current
    if (!el) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          observer.unobserve(el)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    )
    
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  
  return ref
}

export function useRevealGroup(count) {
  const refs = Array.from({ length: count }, () => useRef(null))
  
  useEffect(() => {
    refs.forEach((ref, i) => {
      const el = ref.current
      if (!el) return
      
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add('visible'), i * 120)
            observer.unobserve(el)
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
      )
      observer.observe(el)
      return () => observer.disconnect()
    })
  }, [])
  
  return refs
}
