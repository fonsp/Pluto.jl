"Things that will hopefully go into HTTP.jl someday."
module WebsocketFix

import HTTP.WebSockets

function readframe(ws::WebSockets.WebSocket)
    header = WebSockets.readheader(ws.io)
    @debug 1 "WebSocket ➡️  $header"

    if header.length > 0
        if length(ws.rxpayload) < header.length
            resize!(ws.rxpayload, header.length)
        end
        unsafe_read(ws.io, pointer(ws.rxpayload), header.length)
        @debug 2 "          ➡️  \"$(String(ws.rxpayload[1:header.length]))\""
    end
    l = Int(header.length)
    if header.hasmask
        WebSockets.mask!(ws.rxpayload, ws.rxpayload, l, reinterpret(UInt8, [header.mask]))
    end

    return header, view(ws.rxpayload, 1:l)
end

"""
    readmessage(ws::WebSocket)

HTTP.jl's default `readframe` (or `readavailable`) doesn't look at the FINAL field of frames.
This means that it will return a frame no matter what, even though most people expect to get a full message.
This method fixes that and gives you what you expect.
"""
function readmessage(ws::WebSockets.WebSocket)
    # this code is based on HTTP.jl source code: https://github.com/JuliaWeb/HTTP.jl/blob/master/src/WebSockets.jl

    header, data = readframe(ws)
    l = Int(header.length)

    if header.opcode == WebSockets.WS_CLOSE
        ws.rxclosed = true
        if l >= 2
            status = UInt16(ws.rxpayload[1]) << 8 | ws.rxpayload[2]
            if status != 1000
                message = String(ws.rxpayload[3:l])
                status_descr = get(WebSockets.STATUS_CODE_DESCRIPTION, Int(status), "")
                msg = "Status: $(status_descr), Internal Code: $(message)"
                throw(WebSockets.WebSocketError(status, msg))
            end
        end
        return UInt8[]
    elseif header.opcode == WebSockets.WS_PING
        WebSockets.wswrite(ws, WebSockets.WS_FINAL | WebSockets.WS_PONG, ws.rxpayload[1:l])
        header2, data2 = readframe(ws)
        return data2
    elseif header.opcode == WebSockets.WS_CONTINUATION
        error("WS continuation gone wrong")
    else
        if header.final == true
            return view(ws.rxpayload, 1:l)
        else
            multi_message_data = UInt8[]
            append!(multi_message_data, data)  
            while true
                header2, data2 = readframe(ws)
                if header2.opcode != WebSockets.WS_CONTINUATION
                    println("header2.opcode:", header2.opcode)
                    println("header2:", header2)
                    throw("Should be a continuation")
                end
                append!(multi_message_data, data2)
                if header2.final
                    break
                end
            end

            multi_message_data
        end
    end
end

end