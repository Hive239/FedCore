/**
 * Tests for useToast hook
 */

import { renderHook, act } from '@testing-library/react'
import { useToast, toast } from '../use-toast'

describe('useToast', () => {
  afterEach(() => {
    // Clear all toasts after each test
    act(() => {
      const { dismiss } = useToast.getState?.() || {}
      if (dismiss) dismiss()
    })
  })

  it('should initialize with empty toasts', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toasts).toEqual([])
  })

  it('should add a toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({
        title: 'Test Toast',
        description: 'This is a test toast'
      })
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0]).toMatchObject({
      title: 'Test Toast',
      description: 'This is a test toast',
      open: true
    })
  })

  it('should dismiss a specific toast', () => {
    const { result } = renderHook(() => useToast())

    let toastId: string

    act(() => {
      const toastResult = result.current.toast({
        title: 'Test Toast'
      })
      toastId = toastResult.id
    })

    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      result.current.dismiss(toastId)
    })

    expect(result.current.toasts[0].open).toBe(false)
  })

  it('should dismiss all toasts', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: 'Toast 1' })
      result.current.toast({ title: 'Toast 2' })
    })

    expect(result.current.toasts).toHaveLength(1) // TOAST_LIMIT is 1

    act(() => {
      result.current.dismiss()
    })

    expect(result.current.toasts[0].open).toBe(false)
  })

  it('should limit the number of toasts', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: 'Toast 1' })
      result.current.toast({ title: 'Toast 2' })
      result.current.toast({ title: 'Toast 3' })
    })

    // Should only keep the most recent toast due to TOAST_LIMIT = 1
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].title).toBe('Toast 3')
  })

  it('should update a toast', () => {
    const { result } = renderHook(() => useToast())

    let toastResult: any

    act(() => {
      toastResult = result.current.toast({
        title: 'Original Title'
      })
    })

    act(() => {
      toastResult.update({
        title: 'Updated Title',
        description: 'Updated Description'
      })
    })

    expect(result.current.toasts[0]).toMatchObject({
      title: 'Updated Title',
      description: 'Updated Description'
    })
  })

  it('should handle toast dismissal through onOpenChange', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({
        title: 'Test Toast'
      })
    })

    const currentToast = result.current.toasts[0]

    act(() => {
      currentToast.onOpenChange?.(false)
    })

    expect(result.current.toasts[0].open).toBe(false)
  })

  describe('toast function', () => {
    it('should create a toast with update and dismiss methods', () => {
      let toastResult: any

      act(() => {
        toastResult = toast({
          title: 'Function Toast'
        })
      })

      expect(toastResult).toHaveProperty('id')
      expect(toastResult).toHaveProperty('update')
      expect(toastResult).toHaveProperty('dismiss')
      expect(typeof toastResult.update).toBe('function')
      expect(typeof toastResult.dismiss).toBe('function')
    })

    it('should dismiss toast using returned dismiss method', () => {
      const { result } = renderHook(() => useToast())

      let toastResult: any

      act(() => {
        toastResult = toast({
          title: 'Dismissible Toast'
        })
      })

      expect(result.current.toasts).toHaveLength(1)

      act(() => {
        toastResult.dismiss()
      })

      expect(result.current.toasts[0].open).toBe(false)
    })
  })

  describe('toast variants', () => {
    it('should handle different toast variants', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        result.current.toast({
          title: 'Success Toast',
          variant: 'default'
        })
      })

      expect(result.current.toasts[0].variant).toBe('default')
    })

    it('should handle toast with action', () => {
      const { result } = renderHook(() => useToast())
      const mockAction = <button>Action</button>

      act(() => {
        result.current.toast({
          title: 'Action Toast',
          action: mockAction
        })
      })

      expect(result.current.toasts[0].action).toBe(mockAction)
    })
  })

  describe('error handling', () => {
    it('should handle undefined values gracefully', () => {
      const { result } = renderHook(() => useToast())

      expect(() => {
        act(() => {
          result.current.toast({
            title: undefined as any,
            description: undefined
          })
        })
      }).not.toThrow()
    })
  })
})