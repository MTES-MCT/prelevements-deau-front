'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState
} from 'react'

import Link from 'next/link'
import {usePathname} from 'next/navigation'

function getMenuItems(menu) {
  return [...(menu?.querySelectorAll('[role="menuitem"]') ?? [])]
}

const HeaderDropdownMenu = ({
  active = false,
  iconClassName,
  items,
  label
}) => {
  const pathname = usePathname()
  const generatedId = useId().replaceAll(':', '')
  const menuId = `header-menu-${generatedId}`
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)

  const closeMenu = useCallback(({restoreFocus = false} = {}) => {
    setOpen(false)
    if (restoreFocus) {
      buttonRef.current?.focus()
    }
  }, [])

  const openMenu = useCallback(({focus = 'first'} = {}) => {
    setOpen(true)
    requestAnimationFrame(() => {
      const menuItems = getMenuItems(menuRef.current)
      const target = focus === 'last' ? menuItems.at(-1) : menuItems[0]
      target?.focus()
    })
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handlePointerDown = event => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) {
        closeMenu()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [closeMenu, open])

  const handleButtonKeyDown = event => {
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        openMenu()
        break
      }

      case 'ArrowUp': {
        event.preventDefault()
        openMenu({focus: 'last'})
        break
      }

      case 'Escape': {
        if (open) {
          event.preventDefault()
          closeMenu({restoreFocus: true})
        }

        break
      }

      default:
    }
  }

  const handleMenuKeyDown = event => {
    const menuItems = getMenuItems(menuRef.current)
    const currentIndex = menuItems.indexOf(document.activeElement)
    let nextIndex = null

    switch (event.key) {
      case 'ArrowDown': {
        nextIndex = (currentIndex + 1) % menuItems.length
        break
      }

      case 'ArrowUp': {
        nextIndex = (currentIndex - 1 + menuItems.length) % menuItems.length
        break
      }

      case 'Home': {
        nextIndex = 0
        break
      }

      case 'End': {
        nextIndex = menuItems.length - 1
        break
      }

      case 'Escape': {
        event.preventDefault()
        closeMenu({restoreFocus: true})
        return
      }

      default:
    }

    if (nextIndex !== null) {
      event.preventDefault()
      menuItems[nextIndex]?.focus()
    }
  }

  return (
    <div className='relative w-full lg:w-auto'>
      <button
        ref={buttonRef}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup='menu'
        className={`fr-btn fr-btn--tertiary-no-outline flex w-full items-center gap-2 lg:w-auto ${active ? 'bg-[var(--background-action-low-blue-france)]' : ''}`}
        type='button'
        onClick={() => setOpen(current => !current)}
        onKeyDown={handleButtonKeyDown}
      >
        <span className={iconClassName} aria-hidden='true' />
        <span>{label}</span>
        <span className={`ri-arrow-down-s-line ml-auto transition-transform lg:ml-0 ${open ? 'rotate-180' : ''}`} aria-hidden='true' />
      </button>

      {open && (
        <div
          ref={menuRef}
          className='absolute right-0 top-full z-[1000] mt-1 min-w-[250px] border border-gray-300 bg-white py-1 shadow-lg max-lg:static max-lg:w-full max-lg:shadow-none'
          id={menuId}
          role='menu'
          onKeyDown={handleMenuKeyDown}
        >
          {items.map(item => {
            const content = (
              <>
                <span className={`${item.iconClassName} shrink-0`} aria-hidden='true' />
                <span>{item.label}</span>
              </>
            )
            const className = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm no-underline hover:bg-[var(--background-alt-blue-france)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--border-active-blue-france)]'

            if (item.href) {
              return (
                <Link
                  key={item.key}
                  aria-current={item.active ? 'page' : undefined}
                  className={`${className} ${item.active ? 'bg-[var(--background-action-low-blue-france)] font-semibold' : ''}`}
                  href={item.href}
                  role='menuitem'
                  tabIndex={0}
                  onClick={() => closeMenu()}
                >
                  {content}
                </Link>
              )
            }

            return (
              <button
                key={item.key}
                className={className}
                role='menuitem'
                tabIndex={0}
                type='button'
                onClick={() => {
                  closeMenu()
                  item.onSelect?.()
                }}
              >
                {content}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default HeaderDropdownMenu
