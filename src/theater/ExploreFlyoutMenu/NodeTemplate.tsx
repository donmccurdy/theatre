import SvgIcon from '$shared/components/SvgIcon'
import arrowIcon from 'svg-inline-loader!./arrow.svg'
import React from 'react'
import * as css from './NodeTemplate.css'
import resolveCss from '$shared/utils/resolveCss'
import {
  VolatileId,
  GenericNode,
} from '$theater/integrations/react/treeMirroring/MirrorOfReactTree'
import PropsAsPointer from '$theater/handy/PropsAsPointer'
import {val} from '$shared/DataVerse2/atom'
import {reduceAhistoricState} from '$theater/bootstrap/actions'
import {omit} from 'lodash'
import AnyNode from './AnyNode'
import {Pointer} from '$shared/DataVerse2/pointer'
import {getActiveViewportId, getVolatileIdOfActiveNode} from './utils'
import autoDerive from '$shared/DataVerse/derivations/autoDerive/autoDerive'
import Theater from '$theater/bootstrap/Theater'
import HighlightByInternalInstance from '$theater/common/components/DomHighlighter/HighlightByInternalInstance'

type Props = {
  isSelectable: boolean
  depth: number
  name: React.ReactNode
  css?: typeof css
  /**
   * if null, it is inferred that this node cannot ever have children.
   */
  volatileIdsOfChildren: null | Array<VolatileId>
  volatileId: VolatileId
}

const NodeTemplate = (props: Props) => {
  const classes = resolveCss(css, props.css)

  return (
    <PropsAsPointer props={props}>
      {(propsP, theater) => {
        const volatileId = val(propsP.volatileId)
        const volatileIdsOfChildren = val(propsP.volatileIdsOfChildren)

        const canHaveChildren = Array.isArray(volatileIdsOfChildren)
        const hasChildren =
          canHaveChildren &&
          (volatileIdsOfChildren as Array<VolatileId>).length > 0
        const isSelectable = val(propsP.isSelectable)

        const depth = val(propsP.depth)

        const isSelected =
          isSelectable && getVolatileIdOfActiveNode(theater) === volatileId

        const isExpanded =
          canHaveChildren &&
          val(
            theater.atom2.pointer.ahistoricComponentModel
              .collapsedElementsByVolatileId[volatileId],
          ) !== true

        const toggleExpansion = !canHaveChildren
          ? undefined
          : () => {
              if (!canHaveChildren) return
              if (isExpanded) {
                theater.store.dispatch(
                  reduceAhistoricState(
                    [
                      'ahistoricComponentModel',
                      'collapsedElementsByVolatileId',
                      volatileId,
                    ] as $FixMe,
                    () => true,
                  ),
                )
              } else {
                theater.store.dispatch(
                  reduceAhistoricState(
                    [
                      'ahistoricComponentModel',
                      'collapsedElementsByVolatileId',
                    ],
                    s => omit(s, volatileId),
                  ),
                )
              }
            }

        const select = !isSelectable
          ? undefined
          : () => {
              markElementAsActive(theater, volatileId)
            }

        let childrenNodes = null
        if (isExpanded && hasChildren) {
          const childDepth = depth + 1
          childrenNodes = (volatileIdsOfChildren as Array<VolatileId>).map(
            childVolatileId => (
              <AnyNode
                key={`child-${childVolatileId}`}
                volatileId={childVolatileId}
                depth={childDepth}
              />
            ),
          )
        }

        const nodeP =
          theater.studio.elementTree.mirrorOfReactTreeAtom.pointer
            .nodesByVolatileId[volatileId]

        const internalInstance = val(nodeP.reactSpecific.internalInstance)
        const rendererId = val(nodeP.rendererId)

        return (
          <div
            {...classes(
              'container',
              isSelected && 'selected',
              isExpanded && 'expanded',
              hasChildren && 'hasChildren',
            )}
            style={{'--depth': depth}}
          >
            <div {...classes('top')}>
              {canHaveChildren && (
                <div {...classes('bullet')} onClick={toggleExpansion}>
                  <div {...classes('bulletIcon')}>
                    {<SvgIcon sizing="fill" src={arrowIcon} />}
                  </div>
                </div>
              )}
              <div
                key="name"
                {...classes('name', isSelectable && 'selectable')}
                onClick={select}
              >
                {props.name}
                <HighlightByInternalInstance
                  internalInstance={internalInstance}
                  rendererId={rendererId}
                >
                  {(showOverlay, hideOverlay) => (
                    <div
                      {...classes('highlighter')}
                      {...showOverlay != null && {onMouseEnter: showOverlay}}
                      {...hideOverlay != null && {onMouseLeave: hideOverlay}}
                    />
                  )}
                </HighlightByInternalInstance>
              </div>
            </div>
            {hasChildren && <div {...classes('subNodes')}>{childrenNodes}</div>}
          </div>
        )
      }}
    </PropsAsPointer>
  )
}

export const TaggedDisplayName = (props: {name: string}) => (
  <>
    <span className={css.tagOpen}>&lt;</span>
    <span className={css.tagName}>{props.name}</span>
    <span className={css.tagClose}>&gt;</span>
  </>
)

export default NodeTemplate

function markElementAsActive(theater: Theater, volatileId: string) {
  const activeViewportId = autoDerive(() =>
    getActiveViewportId(theater),
  ).getValue()

  if (!activeViewportId) throw new Error(`No active viewport selected.`)
  theater.store.dispatch(
    reduceAhistoricState(
      [
        'ahistoricWorkspace',
        'activeNodeVolatileIdByViewportId',
        activeViewportId,
      ],
      () => volatileId,
    ),
  )
}

export const getVolatileIdsOfChildrenNLevelsDeep = (
  nodeP: Pointer<GenericNode>,
  theater: Theater,
  n: number,
): Array<VolatileId> => {
  let i = 0
  let currentNodeP: Pointer<GenericNode> = nodeP
  while (i < n) {
    i++
    const volatileIdOfFirstChild = val(
      (currentNodeP as Pointer<GenericNode>).volatileIdsOfChildren[0],
    ) as VolatileId | null

    if (!volatileIdOfFirstChild) return []

    currentNodeP = theater.studio.elementTree.mirrorOfReactTreeAtom.pointer
      .nodesByVolatileId[volatileIdOfFirstChild] as Pointer<GenericNode>
  }

  return (
    (val((currentNodeP as $IntentionalAny).volatileIdsOfChildren) as Array<
      VolatileId
    >) || []
  )
}