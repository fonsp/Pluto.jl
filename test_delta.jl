using Pluto: Delta, OperationalTransform as OT

text = ""

inserts = [
    rand('a':'z', rand(1:5)) |> join
    for _ in 1:10
]

updates = OT.Update[]

tl = 0
for i in inserts
    push!(updates, OT.Update([OT.Insertion(tl,i)],tl,"clientA",[]))
    global tl+=sizeof(i)
end

old_updates = updates[1:4]
new_updates = updates[5:9]

r_old = map(Delta.ranges, old_updates)
r_new = map(Delta.ranges, new_updates)

r_new_new = map(r_new) do r
    for o in r_old
        r = Delta.transform(o,r,:left)
    end
    r
end

new_text = foldl(Delta.apply, r_old;init=text)
@show new_text
@show foldl(Delta.apply, r_new;init=new_text)
foldl(Delta.apply, r_new_new;init=new_text)
