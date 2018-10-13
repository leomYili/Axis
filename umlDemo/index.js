$(function() {
    // XX业务代码

    jsPlumb.ready(function() {
        var instance = (window.jsp = jsPlumb.getInstance({
            DragOptions: { cursor: "pointer", zIndex: 15 },
            Container: $(".artboard").get(0),
            Endpoint: "Dot", // 端点类型
            EndpointStyle: {
                stroke: "#833",
                fill: "#F2F2F2",
                radius: 2.5,
                strokeWidth: 1
            },
            ConnectionOverlays: [
                [
                    "Arrow",
                    {
                        location: 1,
                        visible: true,
                        width: 11,
                        length: 11,
                        id: "ARROW",
                        events: {
                            click: function() {
                                alert("you clicked on the arrow overlay");
                            }
                        }
                    }
                ],
                [
                    "Label",
                    {
                        location: 0.1,
                        label: "测试",
                        visible: true,
                        id: "label",
                        cssClass: "aLabel",
                        events: {
                            tap: function() {
                                alert("hey");
                            }
                        }
                    }
                ]
            ]
        }));

        instance.bind("click", function(conn, originalEvent) {
            // if (confirm("Delete connection from " + conn.sourceId + " to " + conn.targetId + "?"))
            //   instance.detach(conn);
            console.log("click");
        });

        instance.bind("connectionDrag", function(connection) {
            console.log(
                "connection " +
                    connection.id +
                    " is being dragged. suspendedElement is "
            );
        });

        instance.bind("connectionDragStop", function(connection) {
            console.log("connection " + connection.id + " was dragged");
        });

        instance.bind("connectionMoved", function(params) {
            console.log("connection " + params.connection.id + " was moved");
        });

        // 编组
        function addGroup(element, id) {
            instance.addGroup({
                el: element,
                id: id,
                draggable: true,
                constrain: true,
                dragOptions: {
                    stop: function(e) {
                        console.log(e);
                    }
                }
            });
        }

        // 给需要连线的element增加节点
        function makeEndpoint(el) {
            // 可以进行连线的起点
            instance.makeSource(el, {
                anchor: "Continuous",
                maxConnections: -1,
                allowLoopback: false
            });

            // 可以进行连线的终点
            instance.makeTarget(el, {
                anchor: "Continuous",
                maxConnections: -1,
                allowLoopback: false //禁止回环
            });
        }

        function makeEndpointByOverlay(el) {
            // 可以进行连线的起点
            instance.makeSource(el, {
                anchor: "Continuous",
                maxConnections: -1,
                allowLoopback: false,
                connectorOverlays: [
                    [
                        "Arrow",
                        {
                            location: 0.5,
                            id: "sdsd"
                        }
                    ],
                    [
                        "Label",
                        {
                            label: "n",
                            id: "queryn",
                            location: 0.2,
                            cssClass: "jspl_uml-label"
                        }
                    ],
                    [
                        "Label",
                        {
                            label: "1",
                            id: "query1",
                            location: 0.8,
                            cssClass: "jspl_uml-label"
                        }
                    ]
                ],
                endpoint: [
                    "Rectangle",
                    {
                        width: 20,
                        height: 20,
                        // 没有connectorOverlays,文档中只是为了展示说明
                        /* connectorOverlays: [
                            [
                                "Arrow",
                                {
                                    location: 0.5,
                                    id: "sdsd"
                                }
                            ]
                        ] */
                    }
                ]
            });

            instance.addEndpoint(el, {
                isSource: true,
                isTarget: true,
                anchor: "Left",
                connectionsDetachable: true,
                maxConnections: -1,
                allowLoopback: false,
                connectorOverlays: [
                    ["Arrow", { location: 0.5 }],
                    [
                        "Label",
                        {
                            label: "n",
                            id: "queryn",
                            location: 0.2,
                            cssClass: "jspl_uml-label"
                        }
                    ],
                    [
                        "Label",
                        {
                            label: "1",
                            id: "query1",
                            location: 0.8,
                            cssClass: "jspl_uml-label"
                        }
                    ]
                ]
            });

            // 可以进行连线的终点
            instance.makeTarget(el, {
                anchor: "Continuous",
                maxConnections: -1,
                allowLoopback: false //禁止回环
            });
        }

        $(".node").each(function(i, t) {
            addGroup(t, $(t).attr("id"));
        });

        $(".table-column-type-integer").each(function(i, t) {
            makeEndpoint(t);
        });

        $(".table-ts").each(function(i, t) {
            makeEndpointByOverlay(t);
        });
    });
});
