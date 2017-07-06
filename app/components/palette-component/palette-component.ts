'use strict'

import {Item, SparqlItemService, PropertyToValues} from '../../services/sparql-item-service'
import * as d3 from 'd3'
import {FibraService} from '../../services/fibra-service'
import {SparqlTreeService} from '../../services/sparql-tree-service'
import {TreeNode} from '../tree/tree-component'
import {DataFactory, INode, SKOS, OWL, RDF, NamedNode} from '../../models/rdf'
import {INamedNode} from '../../models/rdfjs'
import {IExploreItem} from '../construct-view/explore-component'
import * as angular from 'angular'
import { INgRedux } from 'ng-redux'
import * as TypeActions from '../../actions/types'
import * as ItemActions from '../../actions/items'

interface IPaletteItem extends Item {
  groupValue: string
  groupLabel: string
  typeValue: string
}

type ItemLeaf = {
  'label': string,
  'items': IPaletteItem[],
  'expanded': boolean
}
type ItemBranch = {
  'key': string,
  'value': ItemLeaf
}
type ItemTree = d3.Map<ItemLeaf>
type GroupingProp = {
  'value': string,
  'label': string
}

export class PaletteComponentController {

  private divSel: d3.Selection<HTMLDivElement, {}, null, undefined>
  private containerDiv: d3.Selection<HTMLDivElement, {}, null, undefined>
  private nodeDrag: d3.Selection<SVGSVGElement, {}, null, undefined>
  private circles: d3.Selection<d3.BaseType, IPaletteItem, d3.BaseType, {}>
  private typesD3: d3.Selection<d3.BaseType, ItemBranch, HTMLDivElement, {}>
  private tooltip: d3.Selection<HTMLDivElement, {}, HTMLElement, undefined>
  private paletteItems: IPaletteItem[] = []
  private paletteWidth: number
  private paletteHeight: number
  private paletteOffsetTop: number
  private paletteOffsetLeft: number
  private paletteSearchHeight: number = 40 + 34
  private typeColorScale: d3.ScaleOrdinal<string, string> = d3.scaleOrdinal(d3.schemeCategory20c)
  private labelFilter: string = ''
  private typeItemTreePromise: angular.IPromise<ItemTree>
  private typeItemTree: ItemTree = d3.map<ItemLeaf>()
  private typeForCreation: string
  private expanded: boolean = true
  private typeGroupingProp: GroupingProp = { value: RDF.type.value, label: 'Type' }
  private groupingProp: GroupingProp = this.typeGroupingProp
  private groupingProps: GroupingProp[] = []

  // Actions
  private unsubscribe: any
  private displayItem: any
  private createItem: any
  private addType: any
  private setOrderedTypes: any
  private clearTypes: any
  private types: any
  private items: any

  /* @ngInject */
  public constructor( private fibraService: FibraService,
                      private $element: angular.IAugmentedJQuery,
                      private sparqlItemService: SparqlItemService,
                      private sparqlTreeService: SparqlTreeService,
                      private $q: angular.IQService,
                      private $ngRedux: INgRedux,
                      private $scope: angular.IRootScopeService,
                      private FileSaver: any) {

    let unsub1: () => void = $ngRedux.connect(this.mapTypesToThis, TypeActions)(this)
    let unsub2: () => void = $ngRedux.connect(this.mapItemsToThis, ItemActions)(this)
    this.unsubscribe = () => {
      unsub1()
      unsub2()
    }

    this.typeItemTree.set('', {
      label: 'No type defined',
      items: [],
      expanded: false
    })
    this.query()
  }

  public $onDestroy(): void {
    this.unsubscribe()
  }

  public query(): angular.IPromise<ItemTree> {
    return this.typeItemTreePromise = this.sparqlItemService.getAllItems().then((items: IPaletteItem[]) => {
      let itemTree: ItemTree = this.mergeItems(this.paletteItems, items)
      this.paletteItems = items
      return itemTree
    })
  }

  public rebuild(): void {
    this.typeItemTree = this.mergeItems(this.paletteItems, this.paletteItems)
    this.build(this.typeItemTree)
  }

  public $postLink(): void {
    this.containerDiv = d3.select(this.$element[0]).select<HTMLDivElement>('div.inner-palette-container')
    this.divSel = d3.select(this.$element[0]).select<HTMLDivElement>('div.palette')
    this.nodeDrag = d3.select(this.$element[0]).select<SVGSVGElement>('.palette-node-drag')
    this.nodeDrag.style('display', 'none')
    this.nodeDrag.append('circle')

    this.containerDiv
      .style('height', '100%')
      .style('width', '100%')

    this.divSel
      .style('height', '100%')
      .style('width', '100%')

    this.tooltip = d3.select('body').append<HTMLDivElement>('div')
      .style('position', 'absolute')
      .style('z-index', '20')
      .style('background-color', 'gray')
      .style('color', 'white')
      .style('padding', '3px')
      .style('border-radius', '2px')
      .style('visibility', 'hidden')

    let onChangeFunction: () => angular.IPromise<string> = () => {
      return this.query().then(this.build.bind(this)).then(() => { return 'Done' })
    }

    this.fibraService.on('change', onChangeFunction)

    this.typeItemTreePromise.then((itemTree) => {
      this.build.bind(this)(itemTree)
    })
  }

  public addItem(item: IPaletteItem, coordinates?: [number]): angular.IPromise<void> {
    let itemTypeKey: string = item.typeValue
    let itemType: TreeNode = this.types.types.filter((t) => { return t.id === itemTypeKey })[0]
    let chosenTypes: TreeNode[] = this.types.displayTypes
    if (!chosenTypes[0] && itemType) {
      this.setOrderedTypes([itemType])
    } else if (!chosenTypes[1] && itemType && (chosenTypes[0] !== itemType)) {
      let newTypes: TreeNode[] = chosenTypes.concat([])
      newTypes.push(itemType)
      this.setOrderedTypes(newTypes)
    }
    this.displayItem(item, coordinates)
    this.fibraService.dispatch('change')
    return this.$q.resolve()
  }

  public createItemLocal(label: string): void {
    let node: INode = DataFactory.instance.namedNode(label)
    this.createItem(node)
  }

  public downloadCSV(datum: ItemBranch): void {
    let blob: Blob = new Blob(
      [ d3.csvFormat(
        datum.value.items.map((d) => {
          let sameAs: PropertyToValues = d.localProperties.filter((p) => p.value === OWL.sameAs.value)[0]
          let prefLabel: PropertyToValues = d.localProperties.filter((p) => p.value === SKOS.prefLabel.value)[0]
          return {
            [SKOS.prefLabel.value]: prefLabel ? prefLabel.values[0].value.value : '',
            FibraId: d.value,
            Match: sameAs ? sameAs.values[0].value.value : ''
          }
        }),
        [SKOS.prefLabel.value, 'FibraId', 'Match']
      ) ],
      { type: 'application/csv;charset=utf-8' }
    )
    let filename: string = datum.value.label + '.csv'
    this.FileSaver.saveAs(blob, filename)
  }

  public build(itemTree: ItemTree): void {
    let ctrl: any = this
    this.updateSizing()
    let itemTreeFiltered: ItemBranch[] = itemTree.entries().filter((d) => d.key !== '')
    let items: IPaletteItem[] = itemTreeFiltered.reduce(
      (a: IPaletteItem[], b: ItemBranch) => {
        return a.concat(b.value.items)
      },
      []
    )
    let padding: number = items.length > 300 ? items.length > 2000 ? 1 : 2 : 4
    let paletteHeightLessTypes: number = this.paletteHeight - (itemTreeFiltered.length * 25)
    let rawRadius: number = (Math.sqrt(this.paletteWidth * paletteHeightLessTypes / items.length) - padding) / 2
    let radius: number = rawRadius > 8 ? 8 : rawRadius
    let xOffset: number = radius * 2 + padding / 2
    let yOffset: number = radius * 2 + padding / 2
    let xDots: number = Math.floor((this.paletteWidth) / xOffset) - 1

    // Bring the node drag SVG and the addItem function local
    let nodeDrag: d3.Selection<SVGSVGElement, {}, null, undefined> = this.nodeDrag
    let addItem: any = this.addItem.bind(this)
    let paletteWidth: number = this.paletteWidth

    this.typesD3 = this.divSel
      .selectAll('div.type')
        .data(itemTreeFiltered, (d: ItemBranch) => d.key )
    this.typesD3.exit().remove()
    let typesDivsEnter: d3.Selection<d3.BaseType, ItemBranch, HTMLDivElement, {}> = this.typesD3.enter()
      .append('div')
        .classed('type', true)
        .classed('inverse-icon', true)
        .text((d) => d.value.label)

    typesDivsEnter
      .append('span')
        .classed('glyphicon', true)
        .classed('glyphicon-download', true)
        .on('click', (d) => this.downloadCSV(d))

    typesDivsEnter
      .append('span')
        .classed('glyphicon', true)
        .classed('expand-button', true)
        .on('click', (d) =>  {
          d.value.expanded = !d.value.expanded
          this.typeItemTreePromise.then(this.build.bind(this))
        })

    typesDivsEnter
      .append('svg')
        .attr('width', '100%')

    this.typesD3 = typesDivsEnter
      .merge(this.typesD3)

    this.typesD3.selectAll('.expand-button')
      .classed('glyphicon-resize-small', (d: ItemBranch) => d.value.expanded)
      .classed('glyphicon-resize-full', (d: ItemBranch) => !d.value.expanded)

    this.typesD3.selectAll('svg')
      .style('display', (d: ItemBranch) => d.value.expanded ? 'block' : 'none')

    let typeSvgs: d3.Selection<d3.BaseType, ItemBranch, HTMLDivElement, {}> = this.typesD3.select('svg')
        .attr('height', (d) => {
          return (Math.ceil(d.value.items.length / xDots) + 1) * yOffset
        })

    this.circles = typeSvgs
      .selectAll('circle.item')
        .data((d) => d.value.items, (d: IPaletteItem) => d.value )

    this.circles.exit().remove()

    this.circles = this.circles.enter()
      .append('circle')
        .classed('item', true)
        .attr('r', radius)
        // .on('click', this.addItem.bind(this))
        .on('mouseover', (d: IPaletteItem, i: number) => {
          this.tooltip.style('top', (d3.event.pageY - 10) + 'px')
            .style('left', (d3.event.pageX + 10) + 'px')
            .style('visibility', 'visible')
            .text(d.label + ' (' + d.groupLabel + ')')
        })
        .on('mouseout', (d: IExploreItem, i: number) => {
          this.tooltip.style('visibility', 'hidden')
        })
        .call(d3.drag<SVGElement, IPaletteItem, SVGCircleElement>()
          .on('start', function(d: IPaletteItem): void {
            ctrl.expanded = false
            ctrl.$scope.$digest()

            let thisCircle: d3.Selection<SVGElement, {}, null, undefined> = d3.select(this)
            nodeDrag
              .style('display', 'block')
            nodeDrag.select('circle')
              .classed('item', thisCircle.classed('item'))
              .attr('r', thisCircle.attr('r'))
              .attr('fill', thisCircle.attr('fill'))
              .attr('transform', 'translate(8,8)')
            nodeDrag
              .style('left', d3.event.sourceEvent.clientX - ctrl.paletteOffsetLeft - 14)
              .style('top', d3.event.sourceEvent.clientY - ctrl.paletteOffsetTop - 10)
          })
          .on('drag', function(d: IPaletteItem): void {
            nodeDrag
              .style('left', d3.event.sourceEvent.clientX - ctrl.paletteOffsetLeft - 14)
              .style('top', d3.event.sourceEvent.clientY - ctrl.paletteOffsetTop - 10)
          })
          .on('end', function(d: IPaletteItem): void {
            ctrl.expanded = true
            ctrl.$scope.$digest()
            // If the cursor is on the canvas, display
            let exploreContainer: Element = d3.select<Element, any>('#explorecontainer').node()
            if (
              d3.event.sourceEvent.clientX > exploreContainer.getBoundingClientRect().left &&
              d3.event.sourceEvent.clientX < exploreContainer.getBoundingClientRect().right &&
              d3.event.sourceEvent.clientY > exploreContainer.getBoundingClientRect().top &&
              d3.event.sourceEvent.clientY < exploreContainer.getBoundingClientRect().bottom
            ) {
              addItem(
                d3.select<SVGElement, IPaletteItem>(this).datum(),
                [
                  d3.event.sourceEvent.clientX - exploreContainer.getBoundingClientRect().left,
                  d3.event.sourceEvent.clientY - exploreContainer.getBoundingClientRect().top
                ]
              ).then(() => {
                nodeDrag.style('display', 'none')
              })
            } else {
              nodeDrag.style('display', 'none')
            }
          }))
      .merge(this.circles)
        .call(this.update.bind(this))

    let circleText: d3.Selection<d3.BaseType, IPaletteItem, d3.BaseType, {}> = typeSvgs
        .selectAll('text')
          .data((d) => d.value.items, (d: IPaletteItem) => d.value )

    circleText = circleText.enter()
      .append('text')
        .style('pointer-events', 'none')
      .merge(circleText)

    circleText
      .text((d: IPaletteItem) => {
        if (d.label.split(' ').length > 1) {
          return (d.label.split(' ')[0][0] + d.label.split(' ')[1][0]).toUpperCase()
        } else {
          return (d.label[0] + d.label[1])
        }
      })
      .attr('font-family', 'Ludica Console, monospace')
      .attr('font-size', radius * 1.25 + 'px')
      .attr('transform', (d, i) => { return 'translate(' + (((i % xDots) + 1) * xOffset - 0.7 * radius) + ',' + ((Math.floor(i / xDots) + 1) * yOffset + 0.4 * radius) + ')'})

    this.circles
      .transition()
        .attr('fill', (d: IPaletteItem) => this.typeColorScale(d.typeValue))
        .attr('transform', (d, i) => { return 'translate(' + ((i % xDots) + 1) * xOffset + ',' + (Math.floor(i / xDots) + 1) * yOffset + ')'})
  }

  public update(circles: d3.Selection<d3.BaseType, IPaletteItem, SVGSVGElement, {}>): void {
    let c: d3.Selection<d3.BaseType, IPaletteItem, d3.BaseType, {}> = circles ? circles : this.circles

    c .classed('displayed', (d: IPaletteItem) => this.items.itemIndex[d.value] ? true : false)
      .classed('filtered', (d: IPaletteItem) => this.labelFilter && !(d.label.toUpperCase().indexOf(this.labelFilter.toUpperCase()) !== -1))
  }

  private mapTypesToThis(state): any {
    return {
      types: state.types
    }
  }

  private mapItemsToThis(state): any {
    return {
      items: state.items
    }
  }

  private updateSizing(): void {
    this.paletteWidth = Math.round(window.innerWidth * 0.15) // this.svgSel.node().clientWidth
    this.paletteHeight = Math.round(window.innerHeight * 0.95) - this.paletteSearchHeight
    this.paletteOffsetLeft = Math.round(window.innerHeight * 0.01)
    this.paletteOffsetTop = Math.round(window.innerHeight * 0.04)
    this.divSel.style('height', this.paletteHeight + 'px')
    this.containerDiv.style('height', Math.round(window.innerHeight * 0.95) + 'px')
  }

  private mergeItems(oldItems, newItems: IPaletteItem[]): d3.Map<ItemLeaf> {
    // Wipe old items (bad, but temporary)
    this.typeItemTree = d3.map<ItemLeaf>()

    // Wipe old grouping properties
    let groupingValues: string[] = []
    this.groupingProps = []

    newItems.forEach((item) => {
      let groupProp: PropertyToValues = item.localProperties.filter((p) => p.value === this.groupingProp.value)[0]
      let typeProp: PropertyToValues = item.localProperties.filter((p) => p.value === RDF.type.value)[0]
      if (groupProp && groupProp.values[0] && typeProp && typeProp.values[0]) {
        item.groupValue = groupProp.values[0].value.value
        item.groupLabel = groupProp.values[0].value.label
        item.typeValue = typeProp.values[0].value.value

        // Add type to the type map
        if (!this.typeItemTree.has(item.groupValue)) {
          this.typeItemTree.set(item.groupValue, {
            label: item.groupLabel,
            items: [item],
            expanded: true
          })
        } else {
          this.typeItemTree.get(item.groupValue).items.push(item)
        }
      } else {
        item.groupValue = ''
        item.groupLabel = 'No type defined'
        item.typeValue = ''
      }

      // Extract properties
      item.localProperties.forEach((p) => {
        if (groupingValues.indexOf(p.value) === -1) {
          groupingValues.push(p.value)
          this.groupingProps.push({ value: p.value, label: p.label })
        }
      })
    })
    // Sort by label
    this.typeItemTree.values().forEach((v) => {
      v.items.sort((a: IPaletteItem, b: IPaletteItem) => a.label === b.label ? 0 : a.label > b.label ? 1 : -1)
    })
    return this.typeItemTree
  }
}

export class PaletteComponent implements angular.IComponentOptions {
  public template: any = require('./palette-component.pug')()
  public controller: any = PaletteComponentController
}

angular.module('fibra.components.palette', ['fibra.services'])
  .component('palette', new PaletteComponent())