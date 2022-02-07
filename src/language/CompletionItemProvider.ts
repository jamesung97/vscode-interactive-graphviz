import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, Position, Range, SnippetString, TextDocument } from "vscode";
import attributelist from "./attributelist";
import colors from "./colors";
import arrowType from "./arrowType";

import {isNumber, uniq} from "lodash";
import dirType from "./dirType";
import nodeShapes from "./nodeShapes";

export default class DotCompletionItemProvider implements CompletionItemProvider{
    private colors: CompletionItem[] = [];
    private arrowType: CompletionItem[] = [];
    private nodeShapes: CompletionItem[] = [];
    private dirType: CompletionItem[] = [];
    private compass: CompletionItem[] = [];
    private attributes: {'G': CompletionItem[], 'N': CompletionItem[], 'E': CompletionItem[], 'C': CompletionItem[], 'S': CompletionItem[]} = {
        'G': [],
        'N': [],
        'E': [],
        'C': [],
        'S': [],
    };

    private specialAttributes: {[attribute: string] : string} = {};

    constructor() {
        const names = {
            'G': "Root graph",
            "N": "Nodes",
            "E": "Edges",
            "C": "Clusters",
            "S": "Subgraphs"
        }
        this.colors = colors.split("\n").map(color => {
            const [name, value] = color.split("#");
            const pack = new CompletionItem(name, CompletionItemKind.Color);
            pack.documentation = "#"+value;
            return pack;
        })
        this.arrowType = arrowType.split("|").map(type => {
            const pack = new CompletionItem(type, CompletionItemKind.Constant);
            return pack;
        })
        this.dirType = dirType.split("|").map(type => {
            const pack = new CompletionItem(type, CompletionItemKind.Constant);
            return pack;
        })
        this.compass= "n|ne|e|se|s|sw|w|nw|c|_".split("|").map(type => {
            const pack = new CompletionItem(type, CompletionItemKind.Constant);
            return pack;
        });
        this.nodeShapes=nodeShapes.split("|").map(type => {
            const pack = new CompletionItem(type, CompletionItemKind.Constant);
            return pack;
        });

        attributelist.split("\n").forEach(al => {
            const [attribute, typelist, datatype, ...other] = al.split("|");
            const item = new CompletionItem(attribute, CompletionItemKind.Property);
            item.insertText=attribute+"=";
            if(datatype) {
                if(datatype==="string" || datatype==="lblString" || datatype==="escString") {
                    item.insertText=new SnippetString(item.insertText + "\"$1\"");
                } else if(datatype==="double") {
                    if(other.length>0 && isNumber(other[0])) {
                        item.insertText=new SnippetString(item.insertText + "${1:"+other[0]+"}");
                    } else {
                        item.insertText=new SnippetString(item.insertText + "${1:1.0}");
                    }
                } else if(datatype==="int") {
                    if(other.length>0 && isNumber(other[0])) {
                        item.insertText=new SnippetString(item.insertText + "${1:"+other[0]+"}");
                    } else {
                        item.insertText=new SnippetString(item.insertText + "${1:1}");
                    }
                } else if(datatype==="bool") {
                    if(other.length>0) {
                        item.insertText=new SnippetString(item.insertText + "${1:"+other[0]+"}");
                    } else {
                        item.insertText=new SnippetString(item.insertText + "${1:true}");
                    }
                } else if(datatype!=="") {
                    this.specialAttributes[attribute] = datatype;
                }
            }
            item.documentation = "Available on:"
            for(let i=0; i<typelist.length; i++) {
                (this.attributes as any)[typelist[i] as string].push(item);
                item.documentation += "\n"+(names as any)[typelist[i]];
            }
        });
        console.log(this.specialAttributes);
    }

    provideCompletionItems(
        document: TextDocument,
        position: Position,
        token: CancellationToken,
        context: CompletionContext
    )  : CompletionItem[] | undefined {
        const line = document.lineAt(position.line).text.substring(0, position.character);

        const reg = [
            {
                regex: /^\s*$/,
                func: () => {
                    // ToDo: Filter already set attributes
                    return this.attributes.G;
                }
            },
            {
                regex: /\[\s*([a-z]+\s*=\s*((".*")|([a-zA-Z0-9.]+))\s+)*$/,
                func: () => {
                    // ToDo: Filter already set attributes
                    return this.attributes.N;
                }
            },
            {
                regex: /[a-z0-9]+\:$/,
                func: () => this.compass
            },
            {
                regex: /([a-z]+[1]?)\s*=\s*[a-zA-Z]*$/,
                func: (res : string[]) => {
                    const attribute = res[1];
                    const type = this.specialAttributes[attribute];
                    if(!type) return [];

                    if(type==="color") {
                        return this.colors;
                    } else if(type==="arrowType") {
                        return this.arrowType;
                    } else if(type==="dirType") {
                        return this.dirType;
                    } else if(type==="shape") {
                        return this.nodeShapes;
                    }
                    return [];
                }
            },
        ]

        let suggestions: CompletionItem[] = []

        reg.forEach((el) => {
            const result = line.match(el.regex);
            if (result) {
                suggestions = suggestions.concat(el.func(result))
            }
        });
       
        return uniq(suggestions);
    }
  }