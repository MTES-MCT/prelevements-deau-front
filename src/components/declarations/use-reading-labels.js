import {useLayoutEffect, useRef} from 'react'

function placeReadingLabels(plot) {
  const bounds = (plot.querySelector('[data-label-bounds]') ?? plot).getBoundingClientRect()
  const padding = 3
  const gap = 12
  const labels = Array.from(plot.querySelectorAll('[data-label-candidate]'))
  // Measure all labels before writing. The unit and the user's actual font size count
  // towards the space needed. Hidden HTML labels still expose their natural scrollWidth.
  const candidates = labels.map((label, i) => {
    const button = label.parentElement
    const mark = (button.querySelector('[data-mark]') ?? button).getBoundingClientRect()
    const box = label.getBoundingClientRect()
    const width = label instanceof SVGElement ? box.width : label.scrollWidth
    const center = (mark.left + mark.right) / 2
    const left = Math.max(bounds.left + padding, Math.min(center - width / 2, bounds.right - padding - width))
    const priority = (button.getAttribute('aria-pressed') === 'true' ? 8 : 0) +
      (button.dataset.current === 'true' ? 4 : 0) + (i === labels.length - 1 ? 2 : i === 0 ? 1 : 0)
    return {label, width, left, right: left + width, top: box.top, bottom: box.bottom, shift: left + width / 2 - center, priority}
  }).sort((a, b) => b.priority - a.priority)
  const placed = Array.from(plot.querySelectorAll('[data-label-obstacle], [data-volume-gap]'),
    element => element.getBoundingClientRect())
  for (const box of candidates) {
    const fits = box.width <= bounds.width - 2 * padding && !placed.some(other =>
      box.left < other.right + gap && box.right + gap > other.left &&
      box.top < other.bottom + 3 && box.bottom + 3 > other.top)
    box.label.toggleAttribute('data-reading-label', fits)
    if (fits) {
      box.label.style.setProperty('--label-shift', box.shift + 'px')
      placed.push(box)
    }
  }
}

export default function useReadingLabels(rows, layout, selection) {
  const plotRef = useRef(null)
  useLayoutEffect(() => {
    const plot = plotRef.current
    if (!plot) return
    const update = () => placeReadingLabels(plot)
    update()
    const observer = new ResizeObserver(update)
    // SVG group bounds include their labels. Observe the viewport to avoid a feedback loop.
    observer.observe(plot.ownerSVGElement ?? plot)
    document.fonts?.addEventListener('loadingdone', update)
    return () => {
      observer.disconnect()
      document.fonts?.removeEventListener('loadingdone', update)
    }
  }, [rows, layout, selection])
  return plotRef
}
