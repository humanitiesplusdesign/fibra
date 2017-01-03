namespace fibra {
  'use strict'

  export class ExploreTableComponentController {
    private primaryProperties: String[]
    private secondaryProperties: String[]
    private tertiaryProperties: String[]
    private primaryItems: Item[] = []
    private secondaryItems: Item[] = []

    public constructor( private fibraService: FibraService,
                        private sparqlItemService: SparqlItemService) {
      this.fibraService = fibraService
    }

    public $onChanges(chngsObj: any): void {
      this.primaryProperties = []
      this.secondaryProperties = []
      this.sortProperties();
    }

    private delete(id: INode): angular.IPromise<string> {
      return this.fibraService.dispatchAction(this.fibraService.hideItem(id)).then(() => { return 'ok' })
    }

    private sortProperties(): void {
      // fill in each property array with every property possessed by the associated objects
      for (let i = 0; i < this.primaryItems.length; i++) {
        for (let p = 0; p < this.primaryItems[i].localProperties.length; p++) {
          let duplicate = false
          for (let j = 0; j < this.primaryProperties.length; j++) {
            if (this.primaryProperties[j] == this.primaryItems[i].localProperties[p].label.value) {
              duplicate = true
            }
          }
          if (!duplicate) {
            this.primaryProperties.push(this.primaryItems[i].localProperties[p].label.value)
          }
        }
      }

      for (let i = 0; i < this.secondaryItems.length; i++) {
        for (let p = 0; p < this.secondaryItems[i].localProperties.length; p++) {
          let duplicate = false
          for (let j = 0; j < this.secondaryProperties.length; j++) {
            if (this.secondaryProperties[j] == this.secondaryItems[i].localProperties[p].label.value) {
              duplicate = true
            }
          }
          if (!duplicate) {
            this.secondaryProperties.push(this.secondaryItems[i].localProperties[p].label.value)
          }
        }
      }
    }
  }

  export class ExploreTableComponent implements angular.IComponentOptions {
      public templateUrl: string = 'components/construct-view/explore-table-component/explore-table-component.html'
      public controller = 'ExploreTableComponentController'
      public bindings: {[id: string]: string} = {
        primaryItems: '<',
        secondaryItems: '<'
      }
  }
}