import {useEffect} from 'react'
import getStudio from '@theatre/studio/getStudio'
import {cmdIsDown} from '@theatre/studio/utils/keyboardUtils'
import {getSelectedSequence} from '@theatre/studio/selectors'
import type {$IntentionalAny} from '@theatre/shared/utils/types'
import {val} from '@theatre/dataverse'

export default function useKeyboardShortcuts() {
  const studio = getStudio()
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target: null | HTMLElement =
        e.composedPath()[0] as unknown as $IntentionalAny
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return
      }

      if (e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ') {
        if (cmdIsDown(e)) {
          if (e.shiftKey === true) {
            studio.redo()
          } else {
            studio.undo()
          }
        } else {
          return
        }
      } else if (
        e.code === 'Space' &&
        !e.shiftKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.ctrlKey
      ) {
        const seq = getSelectedSequence()
        if (seq) {
          if (seq.playing) {
            seq.pause()
          } else {
            // TODO: use focusRange if it's set
            const {projectId, sheetId} = seq.address
            const focusRange = val(
              getStudio().atomP.ahistoric.projects.stateByProjectId[projectId]
                .stateBySheetId[sheetId].sequence.focusRange,
            )

            if (typeof focusRange === 'undefined') {
              seq.play({iterationCount: 1000})
            } else {
              seq.play({
                iterationCount: 1000,
                range: [focusRange.range.start, focusRange.range.end],
              })
            }
          }
        } else {
          return
        }
      }
      // alt + \
      else if (
        e.altKey &&
        (e.key === '\\' || e.code === 'Backslash' || e.code === 'IntlBackslash')
      ) {
        studio.transaction(({stateEditors, drafts}) => {
          stateEditors.studio.ahistoric.setVisibilityState(
            drafts.ahistoric.visibilityState === 'everythingIsHidden'
              ? 'everythingIsVisible'
              : 'everythingIsHidden',
          )
        })
      } else {
        return
      }

      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}
