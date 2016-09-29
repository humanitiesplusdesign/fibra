namespace fibra {
  'use strict'

    export class Configuration {
      public preferredLanguage: string = '"en"'
      public primaryEndpoint: PrimaryEndpointConfiguration
      public authorityEndpoints: EndpointConfiguration[] = []
      public archiveEndpoints: EndpointConfiguration[] = []
      public globalDataModelConfiguration: DataModelConfiguration = new DataModelConfiguration()
      public instanceNS: string
      public instanceGraph: string
      public schemaNS: string
      public schemaGraph: string
      public deleteItemQuery: string = SparqlItemService.deleteItemQuery
      public prefixes: string = ''
      public allEndpoints(): EndpointConfiguration[] {
        let allEndpoints: EndpointConfiguration[] = this.archiveEndpoints.concat(this.authorityEndpoints)
        allEndpoints.push(this.primaryEndpoint)
        return allEndpoints
      }
      public remoteEndpoints(): EndpointConfiguration[] {
        return this.archiveEndpoints.concat(this.authorityEndpoints)
      }
    }

    export class EndpointConfiguration {
      public class: string = ''
      public autocompletionTextMatchQueryTemplate: string = SparqlAutocompleteService.defaultMatchQueryTemplate
      public treeQueryTemplate: string = SparqlTreeService.getClassTreeQuery
      public localItemQueryTemplate: string = SparqlItemService.getLocalItemPropertiesQuery
      public remoteItemQueryTemplate: string = SparqlItemService.getRemoteItemPropertiesQuery
      public dataModelConfiguration: DataModelConfiguration = new DataModelConfiguration()
      constructor(public id: string, public title: string, public endpoint: INode, selectedTypes: INode[] = []) {
        this.dataModelConfiguration.setSelectedTypes(selectedTypes)
      }
    }

    export class PrimaryEndpointConfiguration extends EndpointConfiguration {
      constructor(id: string, title: string, endpoint: INode, public updateEndpoint: INode = endpoint) {
        super(id, title, endpoint)
      }
    }

    export class DataModelConfiguration {
      public typeConstraints: string = ''
      public typeTree: TreeNode[] = []
      public selectedTypes: INode[] = []
      public properties: INode[] = []
      public selectedProperties: INode[] = []
      public propertyPropertyMap: {[id: string]: ISourcedNode[] } = {}
      public typeTypeMap: {[id: string]: ISourcedNode[] } = {}
      public setSelectedTypes(selectedTypes: INode[]): void {
        this.selectedTypes = selectedTypes
        this.updateFilter()
      }
      private updateFilter(): void {
        if (this.selectedTypes.length === 0)
          this.typeConstraints = ''
        else
          this.typeConstraints = 'FILTER (?groupId IN (' + this.selectedTypes.map(id => id.toCanonical()).join(', ') + '))'
      }
    }

  export class ConfigurationService {
    public configuration: Configuration = new Configuration()
    constructor(workerService: WorkerService) {
      let c: Configuration = this.configuration
      c.primaryEndpoint = new PrimaryEndpointConfiguration('local', 'Local', new NamedNode('http://ldf.fi/fibra/sparql'), new NamedNode('http://ldf.fi/fibra/sparql'))
      let gettyAutocompletionQueryTemplate: string = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX luc: <http://www.ontotext.com/owlim/lucene#>
PREFIX gvp: <http://vocab.getty.edu/ontology#>
PREFIX aat: <http://vocab.getty.edu/aat/>
PREFIX tgn: <http://vocab.getty.edu/tgn/>
SELECT ?groupId ?groupLabel ?id ?prefLabel ?matchedLabel ?sameAs ?altLabel {
  {
    SELECT ?id ?matchedLabel {
      BIND(CONCAT(REPLACE(<QUERY>,"([\\\\+\\\\-\\\\&\\\\|\\\\!\\\\(\\\\)\\\\{\\\\}\\\\[\\\\]\\\\^\\\\\\"\\\\~\\\\*\\\\?\\\\:\\\\/\\\\\\\\])","\\\\$1"),"*") AS ?query)
      ?id luc:term ?query .
      # CONSTRAINTS
      ?id rdfs:label ?matchedLabel .
    } LIMIT <LIMIT>
  } UNION {
    BIND(CONCAT("\\"",REPLACE(<QUERY>,"([\\\\+\\\\-\\\\&\\\\|\\\\!\\\\(\\\\)\\\\{\\\\}\\\\[\\\\]\\\\^\\\\\\"\\\\~\\\\*\\\\?\\\\:\\\\/\\\\\\\\])","\\\\$1"),"\\"") AS ?query)
    ?id luc:term ?query .
    # CONSTRAINTS
    ?id rdfs:label ?matchedLabel .
    FILTER (LCASE(?matchedLabel)=LCASE(<QUERY>))
  }
  ?id skos:inScheme <SCHEME> .
  FILTER (REGEX(LCASE(?matchedLabel),CONCAT("\\\\b",LCASE(<QUERY>))))
  ?id a ?groupId .
  ?groupId rdfs:label ?groupLabel .
  {
    ?id gvp:prefLabelGVP [xl:literalForm ?prefLabel] .
  } UNION {
    ?id skos:exactMatch ?sameAs .
  }
}`
      let ulanConfiguration: EndpointConfiguration = new EndpointConfiguration('ulan', 'ULAN', new NamedNode('http://ldf.fi/corsproxy/vocab.getty.edu/sparql'), [GETTY.PersonConcept, GETTY.GroupConcept])
      ulanConfiguration.autocompletionTextMatchQueryTemplate = gettyAutocompletionQueryTemplate.replace(/<SCHEME>/g, 'ulan:')
      let tgnConfiguration: EndpointConfiguration = new EndpointConfiguration('tgn', 'TGN', new NamedNode('http://ldf.fi/corsproxy/vocab.getty.edu/sparql'), [GETTY.AdminPlaceConcept, GETTY.PhysAdminPlaceConcept])
      tgnConfiguration.autocompletionTextMatchQueryTemplate = gettyAutocompletionQueryTemplate.replace(/<SCHEME>/g, 'tgn:')
      let viafConfiguration: EndpointConfiguration = new EndpointConfiguration('viaf', 'VIAF', new NamedNode('http://ldf.fi/viaf/sparql'))
      viafConfiguration.autocompletionTextMatchQueryTemplate = viafConfiguration.autocompletionTextMatchQueryTemplate.replace(/# ADDITIONALSELECT/g, `
UNION {
  ?id dcterms:identifier ?rid .
  FILTER(STRSTARTS(?rid,"LC|n"))
  BIND(IRI(REPLACE(?rid, "^LC\\\\|n *","http://id.loc.gov/authorities/names/n")) AS ?sameAs)
}`)
      c.authorityEndpoints = [
        ulanConfiguration,
        new EndpointConfiguration('lcnames', 'LC Names', new NamedNode('http://ldf.fi/lcnames/sparql')),
        viafConfiguration,
        tgnConfiguration,
        new EndpointConfiguration('geonames', 'GeoNames', new NamedNode('http://ldf.fi/geonames/sparql'))
      ]
      c.authorityEndpoints.forEach((e, i) => e.class =  'source' + i)
      let emloConfiguration: EndpointConfiguration = new EndpointConfiguration('emlo', 'EMLO', new NamedNode('http://ldf.fi/emlo/sparql'), [CIDOC.Person, CIDOC.Place, CIDOC.Group])
      emloConfiguration.autocompletionTextMatchQueryTemplate = emloConfiguration.autocompletionTextMatchQueryTemplate.replace(/\{ # ADDITIONALVARIABLES/g, '?ifpWikipediaPage ?ifpODBNId {').replace(/# ADDITIONALSELECT/g, `
UNION {
  {
    ?id <http://emlo.bodleian.ox.ac.uk/schema#cofk_union_relationship_type-is_related_to> ?ref .
    FILTER(REGEX(STR(?ref),'http://..\\\\.wikipedia\\\\.org/wiki/'))
    BIND(?ref AS ?ifpWikipediaPage)
  } UNION {
    ?id <http://emlo.bodleian.ox.ac.uk/schema#cofk_union_relationship_type-is_related_to> ?ref .
    FILTER(STRSTARTS(STR(?ref),'http://www.oxforddnb.com/view/article/'))
    BIND(REPLACE(STR(?ref),'http://www.oxforddnb.com/view/article/([^?]*).*','$1') AS ?ifpODBNId)
  }
}`)
      let sdfbConfiguration: EndpointConfiguration = new EndpointConfiguration('sdfb', 'SDFB', new NamedNode('http://ldf.fi/sdfb/sparql'), [CIDOC.Person, CIDOC.Place, CIDOC.Group])
      sdfbConfiguration.autocompletionTextMatchQueryTemplate = sdfbConfiguration.autocompletionTextMatchQueryTemplate.replace(/\{ # ADDITIONALVARIABLES/g, '?ifpODBNId {').replace(/# ADDITIONALSELECT/g, `
UNION {
  ?id <http://ldf.fi/sdfb/schema#odbnId> ?ifpODBNId .
}
`)
      let procopeConfiguration: EndpointConfiguration = new EndpointConfiguration('procope', 'Procope', new NamedNode('http://ldf.fi/procope/sparql'), [CIDOC.Person, CIDOC.Place, CIDOC.Group])
      procopeConfiguration.autocompletionTextMatchQueryTemplate = procopeConfiguration.autocompletionTextMatchQueryTemplate.replace(/\{ # ADDITIONALVARIABLES/g, '?ifpWikipediaPage {').replace(/# ADDITIONALSELECT/g, `
UNION {
  ?id <http://ldf.fi/procope-schema#wikipediaUrl> ?ref .
  BIND(IRI(?ref) AS ?ifpWikipediaPage)
}
`)
      c.archiveEndpoints = [
        sdfbConfiguration,
        emloConfiguration,
        procopeConfiguration,
        new EndpointConfiguration('fbtee', 'FBTEE', new NamedNode('http://ldf.fi/fbtee/sparql'), [CIDOC.Person, CIDOC.Place, CIDOC.Group]),
        new EndpointConfiguration('schoenberg', 'Schoenberg', new NamedNode('http://ldf.fi/schoenberg/sparql'), [CIDOC.Person, CIDOC.Place, CIDOC.Group])
      ]
      c.archiveEndpoints.forEach((e, i) => e.class =  'source' + (c.authorityEndpoints.length + i))
      c.instanceNS = 'http://ldf.fi/fibra/'
      c.instanceGraph = 'http://ldf.fi/fibra/main/'
      c.schemaNS = 'http://ldf.fi/fibra/schema#'
      c.schemaGraph = 'http://ldf.fi/fibra/schema#'
      workerService.callAll('configurationWorkerService', 'setConfiguration', [c])
    }
  }

  export class ConfigurationWorkerService {
    public configuration: Configuration
    public setConfiguration(configuration: Configuration): void {
      this.configuration = configuration
    }
  }

}