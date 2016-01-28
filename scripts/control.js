
var utilObj = {
    hidePara : function(divId) {
        document.getElementById(divId).style.display = "none";
    },
    showBlockPara : function(divId) {
        document.getElementById(divId).style.display = "inline-block";
    },
    setBackgroundColor : function(divId, color) {
        document.getElementById(divId).style.backgroundColor = color;
    },
    clone : function(obj) {
        if (null == obj || "object" != typeof obj) return obj;
        if (obj instanceof Array) {
            var copy = [];
            var i, len;
            for (i = 0, len = obj.length; i < len; ++i) {
                copy[i] = utilObj.clone(obj[i]);
            }
            return copy;
        }
        if (obj instanceof Object) {
            var copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = utilObj.clone(obj[attr]);
            }
            return copy;
        }
        throw new Error("Unable to copy obj! Its type isn't supported.");
    },
    purge : function(d) {
        var a = d.attributes, i, l, n;
        if (a) {
            for (i = a.length - 1; i >= 0; i -= 1) {
                n = a[i].name;
                if (typeof d[n] === 'function') {
                    d[n] = null;
                }
            }
        }
        a = d.childNodes;
        if (a) {
            l = a.length;
            for (i = 0; i < l; i += 1) {
                utilObj.purge(d.childNodes[i]);
            }
        }
    },
    clearContent : function(tag_Name) {
        var tagRef = document.getElementById(tag_Name);
        utilObj.purge(tagRef);
        tagRef.innerHTML = "";
    },
    setContent : function(tag_Name, content) {
        if (typeof content !== "string") {
            utilObj.clearContent(tag_Name);
        } else {
            var tagRef = document.getElementById(tag_Name);
            utilObj.purge(tagRef);
            tagRef.innerHTML = content;
        }
    },
    //Define the function of adding event listener to element
    addEvent : function(divName, evnt, funct){
        var thElement = document.getElementById(divName);
        if (typeof thElement.addEventListener === "function") {
            utilObj.addEvent = function(divName, evnt, funct) {
                var sElement = document.getElementById(divName);
                sElement.addEventListener(evnt, funct, false);
            }
        } else if (thElement.attachEvent === "function") {
            utilObj.addEvent = function(divName, evnt, funct) {
                var sElement = document.getElementById(divName);
                sElement.attachEvent('on'+evnt, funct);
            }
        } else {
            utilObj.addEvent = function(divName, evnt, funct) {
                var sElement = document.getElementById(divName);
                sElement['on'+evnt] = funct;
            }
        };
        utilObj.addEvent(divName, evnt, funct);
    },
    //add submit event listener to search request button
    addFormListener : function(divName, method) {
        utilObj.addEvent(divName, "submit", function(event) {  
            event.preventDefault();
            method(this.elements);
        })
    },
    addClickFunc : function(divName, funct) {
        var tagName = document.getElementById(divName);
        tagName.onclick = funct;
    }
}
var nodeControl = {
    getLien : function() {
        // document.getElementById("mt").style.display = "inline";
        var a1 = "MATCH (n:Personne)-[r:"
        var ad = "]->(m:Personne) RETURN n,r,m"
        var checkedBox = document.getElementsByClassName("lien");
        var j = checkedBox.length;
        var res = "";
        for (var i = 0; i < j; i += 1) {
            if (checkedBox[i].checked) {
                if (res.length == 0) {
                    res += neo4j.liens[i];
                } else {
                    res += "|" + neo4j.liens[i];
                }
            }
        }
        if (res == "") {
            return false;
        } else {
            return a1 + res + ad;
        }
    }
}

var neo4j = {
    liens : ["LIEN_FINANCIER", "LIEN_RESEAU", "LIEN_JUJU", "LIEN_SANG","LIEN_SOUTIEN", "LIEN_CONNAISSANCE", "LIEN_SEXUEL", "LIEN_INCONNU"],
    path : "http://localhost:7474/",
    userName : "neo4j",
    passWord : "root",
    post : function(cypher, params, callBack) {
        getDBInfo();
        $.ajax({
            type: "POST",
            url: neo4j.path + "db/data/cypher",
            contentType:"application/json",
            beforeSend: function(xhr) {
                var base64 = "Basic "+ btoa(neo4j.userName + ":" + neo4j.passWord);
                xhr.setRequestHeader('Authorization', base64);
            },  
            data: JSON.stringify({ "query" : cypher, "params": paras}),
            success: function(data) {
                callBack(data);
            },
            error: function(data) {
                console.log(data.statusText);
            }
        });
    },
    getGraph : function(data) {
        var nodeIndex = {};
        var res = {links:[], nodes:[]};
        var dataLeng = data.data.length;
        var nodeCount = 0;
        var getNode  = function(node) {
            var re = nodeIndex[node.metadata.id];
            if (!re) {
                nodeIndex[node.metadata.id] = nodeCount;
                res.nodes.push(node);
                re = nodeCount;
                nodeCount += 1;
            }
            return re;
        }
        for (var i = 0; i < dataLeng; i += 1) {
            var node1 = data.data[i][0];
            var node2 = data.data[i][2];
            var n1 = getNode(node1);
            var n2 = getNode(node2);
            var rel = data.data[i][1].metadata;
            rel["source"] = n1;
            rel["target"] = n2;
            res.links.push(rel);
        }
        return res;
    }
}

var panes = {
    showingPane : "",
    panes : {"paraT0":"pane0", "paraT1":"pane1", "paraT2":"pane2"},
    changeShowingPane : function() {
        if (this.id !== panes.showingPane) {
            if (panes.showingPane !== "") {
                utilObj.hidePara(panes.panes[panes.showingPane]);
            }
            panes.showingPane = this.id;
            utilObj.showBlockPara(panes.panes[panes.showingPane]);
        } else {
            utilObj.hidePara(panes.panes[panes.showingPane]);
            panes.showingPane = "";
        };
    }
}

function showGraph(graphData) {
    if (graphData.nodes.length == 0) {
        return 0;
    }
    var wsp = document.getElementById("graph");
    var w = wsp.offsetWidth;
    var h = wsp.offsetHeight;
    var focus_node = null, highlight_node = null;

    var text_center = false;
    var outline = false;

    var min_score = 0;
    var max_score = 1;

    var color = d3.scale.linear()
                .domain([min_score, (min_score+max_score)/2, max_score])
                .range(["lime", "yellow", "red"]);

    var highlight_color = "blue";
    var highlight_trans = 0.1;
      
    var size = d3.scale.pow().exponent(1)
                .domain([3,100])
                .range([8,24]);
        
    var force = d3.layout.force()
                .linkDistance(60)
                .charge(-300)
                .size([w,h]);

    var default_node_color = "#ccc";
    //var default_node_color = "rgb(3,190,100)";
    var default_link_color = "#888";
    var nominal_base_node_size = 8;
    var nominal_text_size = 10;
    var max_text_size = 24;
    var nominal_stroke = 1.5;
    var max_stroke = 4.5;
    var max_base_node_size = 36;
    var min_zoom = 0.4;
    var max_zoom = 4;
    var svg = d3.select("#graph").append("svg");
    var zoom = d3.behavior.zoom().scaleExtent([min_zoom,max_zoom])
    var g = svg.append("g");
    svg.style("cursor","move");

    var linkedByIndex = {};

    graphData.links.forEach(function(d) {
        linkedByIndex[d.source + "," + d.target] = true;
    });

    function isConnected(a, b) {
        return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
    }

    function hasConnections(a) {
        for (var property in linkedByIndex) {
            s = property.split(",");
            if ((s[0] == a.index || s[1] == a.index) && linkedByIndex[property]) {
                return true;
            }
        }
        return false;
    }

    force.nodes(graphData.nodes)
        .links(graphData.links)
        .start();

    var link = g.selectAll(".link")
                .data(graphData.links)
                .enter().append("line")
                .attr("class", "link")
                .style("stroke-width",nominal_stroke)
                .style("stroke", function(d) { 
                    if (isNumber(d.score) && d.score>=0) {
                        return color(d.score);
                    } else {
                        return default_link_color;
                    }
                });

    var node = g.selectAll(".node")
                .data(graphData.nodes)
                .enter().append("g")
                .attr("class", "node")
                .call(force.drag);

    node.on("dblclick.zoom", function(d) {
        d3.event.stopPropagation();
        var dcx = (wsp.offsetWidth/2-d.x*zoom.scale());
        var dcy = (wsp.offsetHeight/2-d.y*zoom.scale());
        zoom.translate([dcx,dcy]);
        g.attr("transform", "translate("+ dcx + "," + dcy  + ")scale(" + zoom.scale() + ")");
    });

    var tocolor = "fill";
    var towhite = "stroke";
    if (outline) {
        tocolor = "stroke"
        towhite = "fill"
    }

    var circle = node.append("path")
                    .attr("d", d3.svg.symbol()
                    .size(function(d) { return Math.PI*Math.pow(size(d.size)||nominal_base_node_size,2); })
                    .type(function(d) { return d.type; }))
                    .style(tocolor, function(d) { 
                        if (isNumber(d.score) && d.score>=0) return color(d.score);
                        else return default_node_color; })
                    .attr("r", function(d) { return size(d.size)||nominal_base_node_size; })
                    .style("stroke-width", nominal_stroke)
                    .style(towhite, "white");

    var text = g.selectAll(".text")
                .data(graphData.nodes)
                .enter().append("text")
                .attr("dy", ".35em")
                .style("font-size", nominal_text_size + "px");

    if (text_center) {
        text.text(function(d) { return d.id; })
            .style("text-anchor", "middle");
    } else {
        text.attr("dx", function(d) {
                return (size(d.size)||nominal_base_node_size); })
            .text(function(d) { return '\u2002'+d.id; });
    }

    node.on("mouseover", function(d) {
            set_highlight(d);})
        .on("mousedown", function(d) {
            d3.event.stopPropagation();
            focus_node = d;
            set_focus(d);
            if (highlight_node === null) {
                set_highlight(d)
            }})
        .on("mouseout", function(d) {
            exit_highlight();
            });

    d3.select(window)
        .on("mouseup", function() {
            if (focus_node!==null) {
                focus_node = null;
                if (highlight_trans<1) {
                    circle.style("opacity", 1);
                    text.style("opacity", 1);
                    link.style("opacity", 1);
                }
            }
            if (highlight_node === null) {
                exit_highlight();
            }});

    function exit_highlight() {
        highlight_node = null;
        if (focus_node===null) {
            svg.style("cursor","move");
            if (highlight_color!="white") {
                circle.style(towhite, "white");
                text.style("font-weight", "normal");
                link.style("stroke", function(o) {
                    return (isNumber(o.score) && o.score>=0)?color(o.score):default_link_color});
            }
        }
    }

    function set_focus(d) {   
        if (highlight_trans<1) {
            circle.style("opacity", function(o) {
                return isConnected(d, o) ? 1 : highlight_trans;
            });
            text.style("opacity", function(o) {
                return isConnected(d, o) ? 1 : highlight_trans;
            });

            link.style("opacity", function(o) {
                return o.source.index == d.index || o.target.index == d.index ? 1 : highlight_trans;
            });
        }
    }


    function set_highlight(d) {
        svg.style("cursor","pointer");
        if (focus_node!==null) {
            d = focus_node;
            highlight_node = d;
        }
        if (highlight_color!="white") {
            circle.style(towhite, function(o) {
                return isConnected(d, o) ? highlight_color : "white";});
            text.style("font-weight", function(o) {
                return isConnected(d, o) ? "bold" : "normal";});
            link.style("stroke", function(o) {
                return o.source.index == d.index || o.target.index == d.index ? highlight_color : ((isNumber(o.score) && o.score>=0)?color(o.score):default_link_color);
            });
        }
    }


    zoom.on("zoom", function() {
        var stroke = nominal_stroke;
        if (nominal_stroke*zoom.scale()>max_stroke) {
            stroke = max_stroke/zoom.scale();
        }
        link.style("stroke-width",stroke);
        circle.style("stroke-width",stroke);

        var base_radius = nominal_base_node_size;
        if (nominal_base_node_size*zoom.scale()>max_base_node_size) {
            base_radius = max_base_node_size/zoom.scale();
        }
        circle.attr("d", d3.svg.symbol()
                    .size(function(d) { return Math.PI*Math.pow(size(d.size)*base_radius/nominal_base_node_size||base_radius,2); })
                    .type(function(d) { return d.type; }))

            circle.attr("r", function(d) { return (size(d.size)*base_radius/nominal_base_node_size||base_radius); })
        if (!text_center) {
            text.attr("dx", function(d) { return (size(d.size)*base_radius/nominal_base_node_size||base_radius); });
        }
        var text_size = nominal_text_size;
        if (nominal_text_size*zoom.scale()>max_text_size) {
            text_size = max_text_size/zoom.scale();
        }
        text.style("font-size",text_size + "px");

        g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    });

    svg.call(zoom);     

    resize();
    window.focus();

    force.on("tick", function() {
        node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        text.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    });

    function resize() {
        var width = wsp.offsetWidth, height = wsp.offsetHeight;
        svg.attr("width", width)
            .attr("height", height);

        force.size([force.size()[0]+(width-w)/zoom.scale(),force.size()[1]+(height-h)/zoom.scale()])
            .resume();
        w = width;
        h = height;
    }

    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }
}

document.getElementById("ps1").onclick = function() {
    var query = nodeControl.getLien();
    if (!query) {
        console.log("wrong");
    } else {
        utilObj.clearContent("graph");
        neo4j.post(query, {}, function(data) {
            showGraph(neo4j.getGraph(data));
        });
    }
};

function getDBInfo() {
    neo4j.path = document.getElementById("dbp").value;
    neo4j.userName = document.getElementById("dbuser").value;
    neo4j.passWord = document.getElementById("dbpass").value;
}

(function() {
    utilObj.addEvent("paraT0", "click", panes.changeShowingPane);
    utilObj.addEvent("paraT1", "click", panes.changeShowingPane);
    utilObj.addEvent("paraT2", "click", panes.changeShowingPane);

})()

