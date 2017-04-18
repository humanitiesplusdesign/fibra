namespace fibra {
  'use strict'

  export class EditSchemaViewComponentController extends EditCitableComponentController<Schema> {

    constructor($stateParams: any, fibraService: FibraService, projectService: ProjectService, toastr: angular.toastr.IToastrService) {
      super($stateParams.sourceId, projectService, toastr)
      if ($stateParams.id) projectService.loadSchema(this.projectSource, $stateParams.id).then(ps => this.c = ps)
      else {
        this.c = new Schema()
        this.c.labels = [ DataFactory.literal('', fibraService.getState().language)]
        this.c.descriptions = [ DataFactory.literal('', fibraService.getState().language)]
        this.c.endpoint = this.projectSource.sparqlEndpoint
      }
    }
  }

  export class EditSchemaViewComponent implements angular.IComponentOptions {
      public controller: string = 'EditSchemaViewComponentController'
      public templateUrl: string = 'components/edit-schema-view/edit-schema-view.html'
  }

}