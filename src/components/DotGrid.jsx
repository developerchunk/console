import { useRef, useEffect, useCallback, useMemo } from 'react'
import { gsap } from 'gsap'
import './DotGrid.css'

const throttle = (func, limit) => {
  let lastCall = 0
  return function throttled(...args) {
    const now = performance.now()
    if (now - lastCall >= limit) {
      lastCall = now
      func.apply(this, args)
    }
  }
}

function hexToRgb(hex) {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!match) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16)
  }
}

export default function DotGrid({
  dotSize = 5,
  gap = 15,
  baseColor = '#2F293A',
  activeColor = '#3B82F6',
  proximity = 120,
  speedTrigger = 100,
  shockRadius = 250,
  shockStrength = 5,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
  className = '',
  style
}) {
  const wrapperRef = useRef(null)
  const canvasRef = useRef(null)
  const dotsRef = useRef([])
  const sizeRef = useRef({ width: 0, height: 0 })
  const pointerRef = useRef({
    x: -9999,
    y: -9999,
    vx: 0,
    vy: 0,
    speed: 0,
    lastTime: 0,
    lastX: 0,
    lastY: 0
  })

  const baseRgb = useMemo(() => hexToRgb(baseColor), [baseColor])
  const activeRgb = useMemo(() => hexToRgb(activeColor), [activeColor])

  const circlePath = useMemo(() => {
    if (typeof window === 'undefined' || !window.Path2D) return null
    const path = new window.Path2D()
    path.arc(0, 0, dotSize / 2, 0, Math.PI * 2)
    return path
  }, [dotSize])

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const rect = wrap.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    if (!width || !height) return

    sizeRef.current = { width, height }

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const cols = Math.floor((width + gap) / (dotSize + gap))
    const rows = Math.floor((height + gap) / (dotSize + gap))
    const cell = dotSize + gap

    const gridWidth = cell * cols - gap
    const gridHeight = cell * rows - gap

    const startX = (width - gridWidth) / 2 + dotSize / 2
    const startY = (height - gridHeight) / 2 + dotSize / 2

    const dots = []
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        dots.push({
          cx: startX + x * cell,
          cy: startY + y * cell,
          xOffset: 0,
          yOffset: 0,
          _inertiaApplied: false
        })
      }
    }

    dotsRef.current = dots
  }, [dotSize, gap])

  useEffect(() => {
    if (!circlePath) return undefined

    let rafId
    const proxSq = proximity * proximity

    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { width, height } = sizeRef.current
      ctx.clearRect(0, 0, width, height)

      const { x: px, y: py } = pointerRef.current

      for (const dot of dotsRef.current) {
        const ox = dot.cx + dot.xOffset
        const oy = dot.cy + dot.yOffset
        const dx = dot.cx - px
        const dy = dot.cy - py
        const distSq = dx * dx + dy * dy

        let color = baseColor
        if (distSq <= proxSq) {
          const distance = Math.sqrt(distSq)
          const t = 1 - distance / proximity
          const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t)
          const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t)
          const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t)
          color = `rgb(${r},${g},${b})`
        }

        ctx.save()
        ctx.translate(ox, oy)
        ctx.fillStyle = color
        ctx.fill(circlePath)
        ctx.restore()
      }

      rafId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafId)
  }, [activeRgb, baseColor, baseRgb, circlePath, proximity])

  useEffect(() => {
    buildGrid()

    let observer = null
    if ('ResizeObserver' in window) {
      observer = new ResizeObserver(buildGrid)
      if (wrapperRef.current) observer.observe(wrapperRef.current)
    } else {
      window.addEventListener('resize', buildGrid)
    }

    return () => {
      if (observer) observer.disconnect()
      else window.removeEventListener('resize', buildGrid)
    }
  }, [buildGrid])

  useEffect(() => {
    const pushDuration = Math.max(0.14, Math.min(0.38, resistance / 2600))

    const resetPointer = () => {
      pointerRef.current.x = -9999
      pointerRef.current.y = -9999
      pointerRef.current.speed = 0
    }

    const isInsideWrapper = (clientX, clientY) => {
      const wrap = wrapperRef.current
      if (!wrap) return false
      const rect = wrap.getBoundingClientRect()
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      )
    }

    const onMove = (event) => {
      if (!isInsideWrapper(event.clientX, event.clientY)) {
        resetPointer()
        return
      }

      const now = performance.now()
      const pointer = pointerRef.current
      const deltaTime = pointer.lastTime ? now - pointer.lastTime : 16
      const deltaX = event.clientX - pointer.lastX
      const deltaY = event.clientY - pointer.lastY

      let velocityX = (deltaX / deltaTime) * 1000
      let velocityY = (deltaY / deltaTime) * 1000
      let speed = Math.hypot(velocityX, velocityY)

      if (speed > maxSpeed) {
        const scale = maxSpeed / speed
        velocityX *= scale
        velocityY *= scale
        speed = maxSpeed
      }

      pointer.lastTime = now
      pointer.lastX = event.clientX
      pointer.lastY = event.clientY
      pointer.vx = velocityX
      pointer.vy = velocityY
      pointer.speed = speed

      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top

      for (const dot of dotsRef.current) {
        const distance = Math.hypot(dot.cx - pointer.x, dot.cy - pointer.y)
        if (speed > speedTrigger && distance < proximity && !dot._inertiaApplied) {
          dot._inertiaApplied = true
          gsap.killTweensOf(dot)

          const falloff = 1 - distance / proximity
          const pushX = (dot.cx - pointer.x + velocityX * 0.005) * falloff
          const pushY = (dot.cy - pointer.y + velocityY * 0.005) * falloff

          gsap.to(dot, {
            xOffset: pushX,
            yOffset: pushY,
            duration: pushDuration,
            ease: 'power2.out',
            onComplete: () => {
              gsap.to(dot, {
                xOffset: 0,
                yOffset: 0,
                duration: returnDuration,
                ease: 'elastic.out(1,0.75)',
                onComplete: () => {
                  dot._inertiaApplied = false
                }
              })
            }
          })
        }
      }
    }

    const onClick = (event) => {
      if (!isInsideWrapper(event.clientX, event.clientY)) return

      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const centerX = event.clientX - rect.left
      const centerY = event.clientY - rect.top

      for (const dot of dotsRef.current) {
        const distance = Math.hypot(dot.cx - centerX, dot.cy - centerY)
        if (distance < shockRadius && !dot._inertiaApplied) {
          dot._inertiaApplied = true
          gsap.killTweensOf(dot)

          const falloff = Math.max(0, 1 - distance / shockRadius)
          const pushX = (dot.cx - centerX) * shockStrength * falloff
          const pushY = (dot.cy - centerY) * shockStrength * falloff

          gsap.to(dot, {
            xOffset: pushX,
            yOffset: pushY,
            duration: pushDuration,
            ease: 'power2.out',
            onComplete: () => {
              gsap.to(dot, {
                xOffset: 0,
                yOffset: 0,
                duration: returnDuration,
                ease: 'elastic.out(1,0.75)',
                onComplete: () => {
                  dot._inertiaApplied = false
                }
              })
            }
          })
        }
      }
    }

    const throttledMove = throttle(onMove, 40)

    window.addEventListener('mousemove', throttledMove, { passive: true })
    window.addEventListener('click', onClick)
    window.addEventListener('mouseleave', resetPointer)

    return () => {
      window.removeEventListener('mousemove', throttledMove)
      window.removeEventListener('click', onClick)
      window.removeEventListener('mouseleave', resetPointer)
    }
  }, [maxSpeed, proximity, resistance, returnDuration, shockRadius, shockStrength, speedTrigger])

  return (
    <section className={`dot-grid ${className}`} style={style}>
      <div ref={wrapperRef} className="dot-grid__wrap">
        <canvas ref={canvasRef} className="dot-grid__canvas" />
      </div>
    </section>
  )
}
