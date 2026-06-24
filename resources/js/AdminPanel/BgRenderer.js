import { Aflow, Agraph } from "../Alib/Aflow.js";
import { Awgpu } from "../Alib/Awgpu/index.js";

export class BgRenderer {
    static async init(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Resize canvas to window size
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        try {
            const backend = await Awgpu.Backend.create(canvas);
            const device = backend.device;
            
            // Cool VTuber-style WGSL Shader
            const shaderCode = `
            struct Uniforms {
                time: f32,
                padding: f32,
                resolution: vec2<f32>,
            };
            @group(0) @binding(0) var<uniform> uniforms: Uniforms;

            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) uv: vec2<f32>,
            };

            @vertex
            fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
                // Generate a full-screen triangle
                var pos = array<vec2<f32>, 3>(
                    vec2<f32>(-1.0, -1.0),
                    vec2<f32>(3.0, -1.0),
                    vec2<f32>(-1.0, 3.0)
                );
                var output : VertexOutput;
                output.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
                output.uv = pos[VertexIndex] * 0.5 + 0.5;
                return output;
            }

            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
                // Slow down the overall animation time
                let t = uniforms.time * 0.15;
                var uv = in.uv;
                
                // Abstract VTuber aesthetic: Floating waves, stars, or geometric gradients
                // Base colors (Idol Pop)
                let color1 = vec3<f32>(0.15, 0.05, 0.25); // Deep Purple
                let color2 = vec3<f32>(0.4, 0.1, 0.3);    // Deep Pink
                let color3 = vec3<f32>(0.1, 0.2, 0.4);    // Deep Blue
                
                // Gentle wavy distortion
                uv.x = uv.x + sin(uv.y * 3.0 + t) * 0.05;
                uv.y = uv.y + cos(uv.x * 2.0 - t * 0.8) * 0.05;

                // Smooth, slow gradient mix
                let mixVal = (sin(uv.x * 3.0 - t * 1.2) + cos(uv.y * 3.0 + t)) * 0.5 + 0.5;
                var finalColor = mix(color1, color2, mixVal);
                finalColor = mix(finalColor, color3, sin(uv.y * 2.0 - uv.x * 1.5 + t * 0.8) * 0.5 + 0.5);

                // Keep it relatively dark so the UI remains legible
                finalColor = finalColor * 0.8;
                
                return vec4<f32>(finalColor, 1.0);
            }
            `;
            
            const module = device.createShaderModule({ code: shaderCode });
            
            const uniformBufferSize = 16; // 4 floats: time, padding, res.x, res.y
            const uniformBuffer = device.createBuffer({
                size: uniformBufferSize,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            
            const bindGroupLayout = device.createBindGroupLayout({
                entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" }
                }]
            });
            
            const pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout]
            });
            
            const pipeline = device.createRenderPipeline({
                layout: pipelineLayout,
                vertex: {
                    module: module,
                    entryPoint: "vs_main"
                },
                fragment: {
                    module: module,
                    entryPoint: "fs_main",
                    targets: [{ format: backend.format }]
                },
                primitive: { topology: "triangle-list" }
            });
            
            const bindGroup = device.createBindGroup({
                layout: bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: uniformBuffer }
                }]
            });
            
            // Build Aflow Graph
            const flow = new Aflow(new Agraph());
            
            const root = flow.addNode({ payload: [new Awgpu.BeginFrame({ label: "BgFrame" })] });
            const pass = flow.addNode({ payload: [
                new Awgpu.RenderPass({
                    label: "BgPass",
                    get colorAttachments() {
                        return [{
                            view: backend.currentView(),
                            clearValue: { r: 0.05, g: 0.05, b: 0.08, a: 1.0 },
                            loadOp: "clear",
                            storeOp: "store",
                        }];
                    }
                }),
                new Awgpu.UsePipeline(pipeline),
                new Awgpu.SetBindGroups([{ index: 0, bindGroup }]),
                new Awgpu.Draw({ vertexCount: 3 }),
                new Awgpu.EndPass()
            ]});
            const end = flow.addNode({ payload: [new Awgpu.EndFrame()] });
            
            // Add links
            flow.addLink(root.id, pass.id, { data: { order: 0 } });
            flow.addLink(root.id, end.id, { data: { order: 1 } });
            // Sort to ensure pass executes before end
            flow.sortOutgoingLinks(root.id, (a, b) => a.data.order - b.data.order);
            
            let startTime = performance.now();
            const bufferData = new Float32Array(4); 
            
            function render() {
                const now = performance.now();
                const t = (now - startTime) / 1000.0;
                
                bufferData[0] = t;
                bufferData[1] = 0; // padding
                bufferData[2] = canvas.width;
                bufferData[3] = canvas.height;
                device.queue.writeBuffer(uniformBuffer, 0, bufferData);
                
                flow.run(root.id, { ctx: backend.newCtx() });
                requestAnimationFrame(render);
            }
            
            render();
            
        } catch (e) {
            console.error("WebGPU BgRenderer failed:", e);
        }
    }
}
