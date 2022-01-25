### A Pluto.jl notebook ###
# v0.17.7

using Markdown
using InteractiveUtils

# ╔═╡ 4c4b77dc-8545-4922-9897-110fa67c99f4
md"# ChildProcesses"

# ╔═╡ 934d18d4-936e-4ee0-aa6e-86aa6f66774c
juliapath() = joinpath(Sys.BINDIR::String, Base.julia_exename())

# ╔═╡ 4df77979-0c35-4139-aa5e-da43c1de3a77
if VERSION >= v"1.7.0"
	function get_task_error(t::Task)
		throw("TODO")
	end
else
	function get_task_error(t::Task)
		CapturedException(Base.catch_stack(t)[end]...)
	end
end

# ╔═╡ 6925ffbb-fd9e-402c-a483-c78f28f892a5
import Serialization

# ╔═╡ 8c97d5cb-e346-4b94-b2a1-4fb5ff093bd5
import UUIDs: UUID, uuid4

# ╔═╡ 87612815-7981-4a69-a65b-4465f48c9fd9
struct ReadMessages
	io::IO
end

# ╔═╡ de680a32-e053-4655-a1cd-111d81a037e6
md"""
## Child process side
"""

# ╔═╡ ce2acdd1-b4bb-4a8f-8346-a56dfa55f56b
Base.@kwdef mutable struct ParentProcess
	parent_to_child=stdin
	child_to_parent=stdout
	channels::Dict{UUID,AbstractChannel}=Dict{UUID,AbstractChannel}()
	messaging_lock=ReentrantLock()
end

# ╔═╡ 87182605-f5a1-46a7-968f-bdfb9d0e08fa
function setup_parent_process()
	# Redirect things written to stdout to stderr,
	# stderr will showup in the Pluto with_terminal view.
	real_stdout = stdout
	redirect_stdout(stderr)

	# Just take away stdin, just in case
	real_stdin = stdin
	redirect_stdin()

	ParentProcess(
		parent_to_child=real_stdin,
		child_to_parent=real_stdout,
	)
end

# ╔═╡ b05be9c7-8cc1-47f9-8baa-db66ac83c24f
Base.@kwdef struct ParentChannel
	process::ParentProcess
	channel_id::UUID
	result_channel::AbstractChannel
end

# ╔═╡ 17cb5a65-2a72-4e7d-8fba-901452b2c19f
md"""
## Parent process side
"""

# ╔═╡ abe897ff-6e86-40eb-a1a6-2918b6c3c5a7
struct LocalSandbox end

# ╔═╡ 884e103a-8925-477d-a264-f15d02a49aa9
md"""
## ChildChannel

I guess this is similar to Distributed.ChildChannel.
It communicates all actions that happen on it (take!, put!, close) to the other side. There is a local channel stored that is used as buffer.
"""

# ╔═╡ 1d63f09f-dfb2-40dd-beb5-45125cb19006
md"## Message types"

# ╔═╡ fc0ca4b5-e03b-4c08-b43d-913ee12269c7
abstract type Message end

# ╔═╡ 3431051e-55ce-46c1-a0f5-364662f5c77b
MessageChannel = AbstractChannel{Message}

# ╔═╡ 85920c27-d8a6-4b5c-93b6-41daa5866f9d
Base.@kwdef mutable struct ChildProcess
	process::Base.AbstractPipe
	channels::Dict{UUID,MessageChannel}=Dict{UUID,MessageChannel}()

	"Lock to make sure there are no messages being sent intervowen"
	messaging_lock=ReentrantLock()
end

# ╔═╡ 63531683-e295-4ba6-811f-63b0d384ba0f
Base.@kwdef struct ChildProcessException <: Exception
	process::ChildProcess
	captured::CapturedException
end

# ╔═╡ e6b3d1d9-0245-4dc8-a0a5-5831c254479b
Base.@kwdef struct ProcessExitedException <: Exception
	process::ChildProcess
end

# ╔═╡ 2a538f97-a9d1-4dcf-a098-5b1e5a8df3ae
function Base.showerror(io::IO, error::ProcessExitedException)
	print(io, "ChildProcessExitedException: Child process has exited")
end

# ╔═╡ 9ba8ee0c-c80c-41d9-8739-11e6ef5d3c15
function Base.showerror(io::IO, error::ChildProcessException)
	print(io, "Child process has an error:")
	Base.showerror(io, error.captured)
end

# ╔═╡ 368ccd31-1681-4a4a-a103-2b9afc0813ee
Base.kill(process::ChildProcess, signal::Int) = Base.kill(process.process, signal)

# ╔═╡ af4f0720-f7f7-4d8a-bd8c-8cf5abaf10a0
Base.kill(process::ChildProcess) = Base.kill(process.process)

# ╔═╡ d4da756e-fa81-49d8-8c39-d76f9d15e96f
Base.process_running(p::ChildProcess) = Base.process_running(p.process)

# ╔═╡ e787d8bd-499d-4a41-8913-62b3d9346748
Base.wait(process::ChildProcess) = Base.wait(process.process)

# ╔═╡ b8865d63-19fa-4438-87a2-ccb531bd73a4
Base.@kwdef struct ChildChannel{T} <: AbstractChannel{T}
	process::ChildProcess
	id::UUID=uuid4()
	local_channel::AbstractChannel{T}
end

# ╔═╡ f81ff6f7-f230-4373-b60b-76e8a0eba929
Base.@kwdef struct Envelope
	channel_id::UUID
	message::Message
end

# ╔═╡ adfb2d12-07a0-4d5e-8e24-1676c07107c7
struct CreateChildChannelMessage <: Message
	expr
end

# ╔═╡ e8256f1f-c778-4fb3-a2d3-12da0e1cb3da
struct BaseMessage <: Message
	value::Any
end

# ╔═╡ f9270f05-fa22-4027-a2ca-7db61d057c56
struct ErrorMessage <: Message
	error::CapturedException
end

# ╔═╡ 0ba318bc-7b4c-4d0f-a46c-2f9dca756926
struct ChannelPushMessage <: Message
	value::Any
end

# ╔═╡ c83f2936-3768-4724-9c5c-335d7a4aae03
struct ChannelCloseMessage <: Message
end

# ╔═╡ 441c27e4-6884-4887-9cd5-bc55d0c49760
struct ChannelTakeMessage <: Message
end

# ╔═╡ 1f868b3c-df9a-4d4d-a6a9-9a196298a3af
md"---"

# ╔═╡ 77df6f7b-ed8e-442a-9489-873fc392937c
md"""
## SingleTakeChannel()

Simple channel that will yield "nothing" and nothing else.
"""

# ╔═╡ 3a62b419-eca2-4de1-89a4-fc9ad6f68372
Base.@kwdef mutable struct SingleTakeChannel <: AbstractChannel{Nothing}
	did_finish=false
end

# ╔═╡ 61410bd1-8456-4608-92d9-3c863f65b89c
function Base.take!(channel::SingleTakeChannel)
	if channel.did_finish
		throw("SingleTakeChannel re-used")
	end
	channel.did_finish = true
	nothing
end

# ╔═╡ 409707ff-b1ea-453d-b933-0a4b1e5f44c8
function Base.iterate(channel::SingleTakeChannel, _=nothing)
	if channel.did_finish
		return nothing
	else
		channel.did_finish = true
		(nothing, nothing)
	end
end

# ╔═╡ 0feb758e-38d4-48c0-a5e9-9d1129b1b1b2
function Base.isopen(channel::SingleTakeChannel)
	!channel.did_finish
end

# ╔═╡ b0bcdbdf-a043-4d25-8582-ed173006e040
function Base.close(single_channel::SingleTakeChannel)
	single_channel.did_finish = true
end

# ╔═╡ a6e50946-dd3d-4738-adc1-26534e184776
md"""
## Binary message frame thing

Functions to send and read binary messages over a stable connection, also functions to serialize to a bytearray.

Pretty simple right now, might want to add cooler stuff later.
"""

# ╔═╡ 131a123b-e319-4939-90bf-7fb035ab2e75
MessageLength = Int

# ╔═╡ e393ff80-3995-11ec-1217-b3642a509067
function read_message(stream)
	message_length_buffer = Vector{UInt8}(undef, 8)
	bytesread = readbytes!(stream, message_length_buffer, 8)
	how_long_will_the_message_be = reinterpret(MessageLength, message_length_buffer)[1]
		
	message_buffer = Vector{UInt8}(undef, how_long_will_the_message_be)
	_bytesread = readbytes!(stream, message_buffer, how_long_will_the_message_be)
	
	message_buffer
end

# ╔═╡ faf3c68e-d0fb-4dd9-ac1b-1ff8d922134b
function send_message(stream, bytes)
	# bytes = Vector{UInt8}(message)
	message_length = convert(MessageLength, length(bytes))
	# @info "message_length" message_length bytes
	how_long_will_the_message_be = reinterpret(UInt8, [message_length])

	# @warn "Writing to stream!!!"
	_1 = write(stream, how_long_will_the_message_be)
	_2 = write(stream, bytes)
	# @warn "WROTE TO STREAM"

	_1 + _2
	# @info "Write" _1 _2
end

# ╔═╡ 52495855-a52d-4edf-9c7c-811a5060e641
function to_binary(message)
	io = PipeBuffer()
	serialized = Serialization.serialize(io, message)
	read(io)
end

# ╔═╡ 590a7882-3d69-48b0-bb1b-f476c7f8a885
function respond_to_parent(; to::ParentProcess, about::UUID, with::Message)
	binary_message = to_binary(Envelope(
		channel_id=about,
		message=with,
	))
	lock(to.messaging_lock)
	try
		send_message(to.child_to_parent, binary_message)
	finally
	    unlock(to.messaging_lock)
	end
end

# ╔═╡ 20f66652-bca0-4e47-a4b7-502cfbcb3db5
function send_message_without_response(process::ChildProcess, envelope::Envelope)
	if !process_running(process)
		throw(ProcessExitedException(process=process))
	end
	
	lock(process.messaging_lock)
	try
		send_message(process.process, to_binary(envelope))
		nothing
	finally
	    unlock(process.messaging_lock)
	end
end

# ╔═╡ e1e79669-8d0a-4b04-a7fd-469e7d8e65b1
function Base.take!(channel::ChildChannel)
	if !isopen(channel.local_channel)
		# Trigger InvalidStateException
		eval(:(@error "ChildChannel closed D:"))
		take!(channel.local_channel)
	end
	
	send_message_without_response(channel.process, Envelope(
		channel_id=channel.id,
		message=ChannelTakeMessage(),
	))
	take!(channel.local_channel)
end

# ╔═╡ ed6c16ed-bf4a-40ce-9c14-a72fd77e24a1
function Base.close(channel::ChildChannel)
	if isopen(channel.local_channel)
		try
			close(channel.local_channel)
			if process_running(channel.process.process)
				send_message_without_response(channel.process, Envelope(
					channel_id=channel.id,
					message=ChannelCloseMessage()
				))
			end
		catch e
			@error "Problem with closing?" e stack=stacktrace(catch_backtrace())
			nothing
		end
	end
	delete!(channel.process.channels, channel.id)
end

# ╔═╡ 4289b4ba-45f2-4be7-b983-68f7d97510fa
Base.close(process::ChildProcess) = Base.close(process.process)

# ╔═╡ 2342d663-030f-4ed2-b1d5-5be1910b6d4c
function create_channel(fn, process::ChildProcess, message)
	remote_channel = create_channel(process, message)
	
	try
		return fn(remote_channel)
	finally
		close(remote_channel)
	end
end

# ╔═╡ 54a03cba-6d00-4632-8bd6-c60753c15ae6
function listen_for_messages_from_child(child_process)
	try
		for result in ReadMessages(child_process.process)
			if !(result isa Envelope && result.channel_id !== nothing)
				throw("Huh")
			end

			
			if haskey(child_process.channels, result.channel_id)
				message = result.message
				channel = child_process.channels[result.channel_id]
				put!(channel, message)
			else
				throw("No channel to push to")
			end
		end
	catch error
		@error "Error in main processing" error bt=stacktrace(catch_backtrace())
		close(child_process.process)
	finally
		for (channel_id, channel) in collect(child_process.channels)
			close(channel, ProcessExitedException(process=child_process))
		end
	end
end

# ╔═╡ d3fe8144-6ba8-4dd9-b0e3-941a96422267
"""
	create_child_process(; custom_stderr=stderr, exeflags=["--history-file=no"]) 

Spawn a child process that you'll be able to `call()` on and communicate with over
`RemoteChannels`.

It spawns a process using `open` with some ad-hoc julia code that also loads the `ChildProcesses` module. It then spawns a loop for listening to the spawned process.
The returned `ChildProcess` is basically a bunch of event listeners (in the form of channels) that 
"""
function create_child_process(; custom_stderr=stderr, exeflags=["--history-file=no", "--threads=auto"])
	this_file = split(@__FILE__(), "#")[1]
	this_module = string(nameof(@__MODULE__))
	
	code = """
	# Make sure this library is included in main
	var"$this_module" = @eval Main module var"$this_module"
		include("$this_file")
	end
		
	const parent_process = var"$this_module".setup_parent_process()

	Threads.@spawn begin
		try
			var"$this_module".listen_for_messages_from_parent(parent_process)
			@info "Done?"
		catch error
			@error "Shutdown error" error
			rethrow(error)
		end
	end

	try
		while true
			sleep(typemax(UInt64))
		end
	catch e
		@error "HMMM SIGNINT MAYBE?" e
	end
	"""
	
	process = open(
		pipeline(`$(juliapath()) $exeflags -e $code`, stderr=custom_stderr),
		read=true,
		write=true,
	)

	child_process = ChildProcess(process=process)
	schedule(Task() do
		listen_for_messages_from_child(child_process)
	end)
	child_process
end

# ╔═╡ 6a7aa0ce-0ae3-4e7d-a93a-bfdebe406220
begin
	function handle_child_message(
		message,
		process::ChildProcess,
		input_channel::AbstractChannel,
		output_channel::AbstractChannel,
	)
		@warn "Unknown message type" message
	end

	function handle_child_message(
		message::ChannelPushMessage,
		process::ChildProcess,
		input_channel::AbstractChannel,
		output_channel::AbstractChannel,
	)
		put!(output_channel, message.value)
	end

	function handle_child_message(
		message::ChannelCloseMessage,
		process::ChildProcess,
		input_channel::AbstractChannel,
		output_channel::AbstractChannel,
	)
		close(output_channel)
	end

	function handle_child_message(
		message::ErrorMessage,
		process::ChildProcess,
		input_channel::AbstractChannel,
		output_channel::AbstractChannel,
	)
		close(output_channel, ChildProcessException(
			process=process,
			captured=message.error,
		))
	end
end

# ╔═╡ f99f4659-f71e-4f2e-a674-67ba69289817
function create_channel(process::ChildProcess, expr)
	channel_id = uuid4()

	# Create and register channel for responses
	response_channel = Channel{Message}()
	process.channels[channel_id] = response_channel

	# Tell the child process to start executing
	send_message_without_response(process, Envelope(
		channel_id=channel_id,
		message=CreateChildChannelMessage(expr)
	))

	# Map the messages from the child process to actions
	actual_values_channels = Channel(Inf) do ch
		try
			for message in response_channel
				handle_child_message(
					message,
					process,
					response_channel,
					ch,
				)
			end
		catch e
			@error "THIS SHOULDNT ERROR MATE" e
			close(ch, e)
		finally
			close(ch)
			close(response_channel)
		end
	end

	ChildChannel(
		process=process,
		id=channel_id,
		local_channel=actual_values_channels,
	)
end

# ╔═╡ 4b42e233-1f06-49c9-8c6a-9dc21c21ffb7
function call(process::ChildProcess, expr)
	create_channel(process, quote
		Channel() do ch
			put!(ch, $expr)
		end
	end) do channel
		take!(channel)
	end
end

# ╔═╡ e3e16a8b-7124-4678-8fe7-12ed449e1954
function call_without_fetch(process::ChildProcess, expr)
	create_channel(process, quote
		$expr
		$(SingleTakeChannel())
	end) do channel
		take!(channel)
	end
end

# ╔═╡ 7da416d1-5dfb-4510-9d32-62c1464a83d4
function from_binary(message)
	Serialization.deserialize(IOBuffer(message))
end

# ╔═╡ 009ad714-b759-420a-b49a-6caed7ee3faf
function Base.iterate(message_reader::ReadMessages, state=nothing)
	if eof(message_reader.io)
		return nothing
	end

	message = from_binary(read_message(message_reader.io))
	(message, nothing)
end

# ╔═╡ 5fb65aec-3512-4f48-98ce-300ab9fdadfe
begin
	function Base.iterate(channel::ChildChannel)
		send_message_without_response(channel.process, Envelope(
			channel_id=channel.id,
			message=ChannelTakeMessage(),
		))
		Base.iterate(channel.local_channel)
	end
	function Base.iterate(channel::ChildChannel, x)
		send_message_without_response(channel.process, Envelope(
			channel_id=channel.id,
			message=ChannelTakeMessage(),
		))
		Base.iterate(channel.local_channel, x)
	end
end

# ╔═╡ 46d905fc-d41e-4c9a-a808-14710f64293a
begin
	function handle_message_from_parent_channel(
		parent_channel::ParentChannel,
		message::ChannelTakeMessage,
	)
		next = iterate(parent_channel.result_channel)
		if next === nothing
			respond_to_parent(
				to=parent_channel.process,
				about=parent_channel.channel_id,
				with=ChannelCloseMessage(),
			)
			true
		else
			respond_to_parent(
				to=parent_channel.process,
				about=parent_channel.channel_id,
				with=ChannelPushMessage(next[1])
			)
			false
		end
	end
	
	function handle_message_from_parent_channel(
		parent_channel::ParentChannel,
		message::ChannelCloseMessage,
	)
		if isopen(parent_channel.result_channel)
			close(parent_channel.result_channel)
		end
		false
	end
	
	function handle_message_from_parent_channel(
		parent_channel::ParentChannel,
		message::Message,
	)
		@warn "Unknown channel message type" message
		false
	end
end

# ╔═╡ 13089c5d-f833-4fb7-b8cd-4158b1a57103
function create_parent_channel(; process, channel_id, result_channel)
	Channel(Inf) do input_channel
		try
			for message in input_channel
				parent_channel = ParentChannel(
					process=process,
					channel_id=channel_id,
					result_channel=result_channel,
				)

				if handle_message_from_parent_channel(
					parent_channel,
					message,
				)
					break
				end
			end
		catch error
			if error isa InterruptException
				rethrow(error)
			else
				@error "Error in channel" error
				respond_to_parent(
					to=process,
					about=channel_id,
					with=ErrorMessage(CapturedException(error, catch_backtrace()))
				)
			end
		finally
			close(input_channel)
		end
	end
end

# ╔═╡ e4109311-8252-4793-87b8-eae807df7997
function listen_for_messages_from_parent(process::ParentProcess)
	channels = process.channels

	# ?? What do these locks do?? They look cool, but are they useful actually?
	locks = Dict{UUID, ReentrantLock}()

	for envelope in ReadMessages(process.parent_to_child)
		channel_id = envelope.channel_id
		message = envelope.message
		
		channel_lock = get!(locks, envelope.channel_id) do 
			ReentrantLock()
		end
		
		schedule(Task() do
			lock(channel_lock)
			try
				if envelope.message isa CreateChildChannelMessage
					@assert !haskey(process.channels, channel_id)
					
					result_channel = Main.eval(message.expr)
					process.channels[channel_id] = create_parent_channel(
						process=process,
						channel_id=channel_id,
						result_channel=result_channel,
					)
				else
					if (
						haskey(process.channels, channel_id) &&
						isopen(process.channels[channel_id])
					)
						put!(process.channels[channel_id], message)
					else
						respond_to_parent(
							to=process,
							about=channel_id,
							with=ChannelCloseMessage(),
						)
					end
				end
			catch error
				@error "Does it error here already?" error
				respond_to_parent(
					to=process,
					about=envelope.channel_id, 
					with=ErrorMessage(CapturedException(error, catch_backtrace()))
				)
			finally
				unlock(channel_lock)
			end
		end)
	end
end

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
Serialization = "9e88b42a-f829-5b0c-bbe9-9e923198166b"
UUIDs = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

[[Random]]
deps = ["Serialization"]
uuid = "9a3f8284-a2c9-5f02-9a11-845980a1fd5c"

[[SHA]]
uuid = "ea8e919c-243c-51af-8825-aaa63cd721ce"

[[Serialization]]
uuid = "9e88b42a-f829-5b0c-bbe9-9e923198166b"

[[UUIDs]]
deps = ["Random", "SHA"]
uuid = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"
"""

# ╔═╡ Cell order:
# ╟─4c4b77dc-8545-4922-9897-110fa67c99f4
# ╠═d3fe8144-6ba8-4dd9-b0e3-941a96422267
# ╠═f99f4659-f71e-4f2e-a674-67ba69289817
# ╠═2342d663-030f-4ed2-b1d5-5be1910b6d4c
# ╠═4b42e233-1f06-49c9-8c6a-9dc21c21ffb7
# ╠═e3e16a8b-7124-4678-8fe7-12ed449e1954
# ╟─934d18d4-936e-4ee0-aa6e-86aa6f66774c
# ╟─54a03cba-6d00-4632-8bd6-c60753c15ae6
# ╠═4df77979-0c35-4139-aa5e-da43c1de3a77
# ╠═6925ffbb-fd9e-402c-a483-c78f28f892a5
# ╠═8c97d5cb-e346-4b94-b2a1-4fb5ff093bd5
# ╠═63531683-e295-4ba6-811f-63b0d384ba0f
# ╠═9ba8ee0c-c80c-41d9-8739-11e6ef5d3c15
# ╠═4289b4ba-45f2-4be7-b983-68f7d97510fa
# ╠═e6b3d1d9-0245-4dc8-a0a5-5831c254479b
# ╠═2a538f97-a9d1-4dcf-a098-5b1e5a8df3ae
# ╠═87612815-7981-4a69-a65b-4465f48c9fd9
# ╠═009ad714-b759-420a-b49a-6caed7ee3faf
# ╟─de680a32-e053-4655-a1cd-111d81a037e6
# ╠═ce2acdd1-b4bb-4a8f-8346-a56dfa55f56b
# ╠═87182605-f5a1-46a7-968f-bdfb9d0e08fa
# ╠═b05be9c7-8cc1-47f9-8baa-db66ac83c24f
# ╟─590a7882-3d69-48b0-bb1b-f476c7f8a885
# ╠═46d905fc-d41e-4c9a-a808-14710f64293a
# ╠═13089c5d-f833-4fb7-b8cd-4158b1a57103
# ╠═e4109311-8252-4793-87b8-eae807df7997
# ╟─17cb5a65-2a72-4e7d-8fba-901452b2c19f
# ╠═3431051e-55ce-46c1-a0f5-364662f5c77b
# ╠═85920c27-d8a6-4b5c-93b6-41daa5866f9d
# ╠═af4f0720-f7f7-4d8a-bd8c-8cf5abaf10a0
# ╠═368ccd31-1681-4a4a-a103-2b9afc0813ee
# ╠═d4da756e-fa81-49d8-8c39-d76f9d15e96f
# ╠═e787d8bd-499d-4a41-8913-62b3d9346748
# ╠═20f66652-bca0-4e47-a4b7-502cfbcb3db5
# ╠═6a7aa0ce-0ae3-4e7d-a93a-bfdebe406220
# ╠═abe897ff-6e86-40eb-a1a6-2918b6c3c5a7
# ╟─884e103a-8925-477d-a264-f15d02a49aa9
# ╠═b8865d63-19fa-4438-87a2-ccb531bd73a4
# ╠═e1e79669-8d0a-4b04-a7fd-469e7d8e65b1
# ╠═ed6c16ed-bf4a-40ce-9c14-a72fd77e24a1
# ╠═5fb65aec-3512-4f48-98ce-300ab9fdadfe
# ╟─1d63f09f-dfb2-40dd-beb5-45125cb19006
# ╠═f81ff6f7-f230-4373-b60b-76e8a0eba929
# ╠═fc0ca4b5-e03b-4c08-b43d-913ee12269c7
# ╠═adfb2d12-07a0-4d5e-8e24-1676c07107c7
# ╠═e8256f1f-c778-4fb3-a2d3-12da0e1cb3da
# ╠═f9270f05-fa22-4027-a2ca-7db61d057c56
# ╠═0ba318bc-7b4c-4d0f-a46c-2f9dca756926
# ╠═c83f2936-3768-4724-9c5c-335d7a4aae03
# ╠═441c27e4-6884-4887-9cd5-bc55d0c49760
# ╟─1f868b3c-df9a-4d4d-a6a9-9a196298a3af
# ╟─77df6f7b-ed8e-442a-9489-873fc392937c
# ╠═3a62b419-eca2-4de1-89a4-fc9ad6f68372
# ╠═61410bd1-8456-4608-92d9-3c863f65b89c
# ╠═409707ff-b1ea-453d-b933-0a4b1e5f44c8
# ╠═0feb758e-38d4-48c0-a5e9-9d1129b1b1b2
# ╠═b0bcdbdf-a043-4d25-8582-ed173006e040
# ╟─a6e50946-dd3d-4738-adc1-26534e184776
# ╟─131a123b-e319-4939-90bf-7fb035ab2e75
# ╟─e393ff80-3995-11ec-1217-b3642a509067
# ╟─faf3c68e-d0fb-4dd9-ac1b-1ff8d922134b
# ╟─52495855-a52d-4edf-9c7c-811a5060e641
# ╟─7da416d1-5dfb-4510-9d32-62c1464a83d4
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
