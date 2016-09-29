namespace fibra {
  'use strict'

  import s = fi.seco.sparql

  export class SparqlTreeService {
    public static getClassTreeQuery: string = `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX sf: <http://ldf.fi/functions#>
SELECT ?subClass ?superClass ?class ?classLabel ?instances {
  {
    ?subClass rdfs:subClassOf ?class .
    FILTER EXISTS {
      ?p a ?subClass .
    }
  } UNION {
    {
      SELECT ?class (COUNT(DISTINCT ?p) AS ?instances) {
        ?p a ?class .
      }
      GROUP BY ?class
    }
  }
  ?class sf:preferredLanguageLiteral (skos:prefLabel rdfs:label skos:altLabel 'en' '' ?classLabel) .
}
`
    constructor(private workerService: WorkerService) {}
    public getTree(endpoint: string, query: string, canceller?: angular.IPromise<any>): angular.IPromise<TreeNode[]> {
      return this.workerService.call('sparqlTreeWorkerService', 'getTree', [endpoint, query], canceller)
    }
  }

  export class SparqlTreeWorkerService {
    constructor(private sparqlService: s.SparqlService) {}

    public getTree(endpoint: string, query: string, canceller?: angular.IPromise<any>): angular.IPromise<TreeNode[]> {
      return this.sparqlService.query(endpoint, query, {timeout: canceller}).then(
        (response: angular.IHttpPromiseCallbackArg<s.ISparqlBindingResult<{[id: string]: s.ISparqlBinding}>>) => {
          let parents: {[id: string]: {[id: string]: boolean}} = {}
          let classes: {[id: string]: TreeNode} = {}
          response.data!.results.bindings.forEach(binding => {
            if (binding['classLabel'])
              classes[binding['class'].value] = new TreeNode(binding['class'].value, binding['classLabel'].value)
            if (binding['instances'])
              classes[binding['class'].value].instances = parseInt(binding['instances'].value, 10)
            if (binding['subClass']) {
              let subClass: string = binding['subClass'].value
              if (!parents[subClass]) parents[subClass] = {}
              parents[subClass][binding['class'].value] = true
            }
            if (binding['superClass']) {
              let subClass: string = binding['class'].value
              if (!parents[subClass]) parents[subClass] = {}
              parents[subClass][binding['superClass'].value] = true
            }
          })
          let ret: TreeNode[] = []
          for (let id in classes) {
            if (!parents[id]) ret.push(classes[id]); else for (let pid in parents[id])
                classes[pid].children.push(classes[id])
          }
          return ret
        }
      )
    }
  }

}