(function () {
  'use strict';

  var hosts = document.querySelectorAll('[data-tech-scan]');
  if (!hosts.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var VERT = `#version 300 es
    precision highp float;
    out vec2 vUv;
    void main() {
      vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      vUv = p;
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;

  var BASE = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uImage;
    uniform vec2 uResolution;
    uniform vec2 uImageSize;
    uniform vec2 uPointer;
    uniform vec2 uObjectPosition;
    uniform float uScan;
    out vec4 outColor;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    vec2 coverUv(vec2 uv) {
      float dstAspect = uResolution.x / uResolution.y;
      float srcAspect = uImageSize.x / uImageSize.y;
      vec2 visible = vec2(1.0);
      if (dstAspect > srcAspect) visible.y = srcAspect / dstAspect;
      else visible.x = dstAspect / srcAspect;
      vec2 start = vec2((1.0 - visible.x) * uObjectPosition.x,
                        (1.0 - visible.y) * (1.0 - uObjectPosition.y));
      return uv * visible + start;
    }

    void main() {
      vec2 uv = coverUv(vUv);
      vec3 raw = texture(uImage, uv).rgb;
      float luma = dot(raw, vec3(0.2126, 0.7152, 0.0722));
      vec2 centered = (uv - vec2(0.5, 0.56)) * vec2(0.85, 1.15);
      float portraitField = 1.0 - smoothstep(0.0, 0.72, length(centered));
      float depth = clamp(0.46 * (1.0 - uv.y) + 0.34 * luma + 0.20 * portraitField, 0.0, 1.0);

      vec2 displacedUv = uv + depth * uPointer * 0.005;
      vec3 base = texture(uImage, displacedUv).rgb;
      float mono = dot(base, vec3(0.2126, 0.7152, 0.0722));
      base = mix(base, vec3(mono), 0.94);
      base = (base - 0.5) * 1.07 + 0.5;

      float aspect = uResolution.x / uResolution.y;
      vec2 gridUv = vec2(vUv.x * aspect, vUv.y) * 120.0;
      vec2 cell = mod(gridUv, 2.0) - 1.0;
      float dotMask = 1.0 - smoothstep(0.49, 0.5, length(cell));
      float cellNoise = hash21(floor(gridUv * 0.5));
      float contour = 1.0 - smoothstep(0.0, 0.02, abs(depth - uScan));
      float spark = dotMask * cellNoise * contour * 10.0;
      vec2 faceSpace = (uv - vec2(0.5, 0.72)) / vec2(0.205, 0.245);
      float faceProtection = 1.0 - smoothstep(0.82, 1.12, length(faceSpace));
      spark *= 1.0 - faceProtection;
      vec3 screened = 1.0 - (1.0 - base) * (1.0 - vec3(spark));
      outColor = vec4(screened, clamp(spark, 0.0, 1.0));
    }`;

  var BLUR = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec2 uTexel;
    uniform vec2 uDirection;
    uniform float uThreshold;
    uniform bool uExtract;
    out vec4 outColor;

    vec3 sourceAt(vec2 uv) {
      vec4 sampleColor = texture(uTexture, uv);
      if (!uExtract) return sampleColor.rgb;
      float b = max(max(sampleColor.r, sampleColor.g), sampleColor.b);
      float gate = smoothstep(uThreshold, min(1.0, uThreshold + 0.12), b);
      return sampleColor.rgb * gate * sampleColor.a;
    }

    void main() {
      vec2 stepUv = uDirection * uTexel;
      vec3 c = sourceAt(vUv) * 0.227027;
      c += sourceAt(vUv + stepUv * 1.384615) * 0.316216;
      c += sourceAt(vUv - stepUv * 1.384615) * 0.316216;
      c += sourceAt(vUv + stepUv * 3.230769) * 0.070270;
      c += sourceAt(vUv - stepUv * 3.230769) * 0.070270;
      outColor = vec4(c, 1.0);
    }`;

  var COMPOSITE = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uScene;
    uniform sampler2D uBloom;
    uniform float uBloomStrength;
    out vec4 outColor;
    void main() {
      vec3 scene = texture(uScene, vUv).rgb;
      vec3 bloom = texture(uBloom, vUv).rgb;
      outColor = vec4(scene + bloom * uBloomStrength, 1.0);
    }`;

  function shader(gl, type, source) {
    var item = gl.createShader(type);
    gl.shaderSource(item, source);
    gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(item));
    return item;
  }

  function program(gl, fragment) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  function target(gl, width, height) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { texture: tex, fbo: fbo };
  }

  function start(host) {
    var canvas = host.querySelector('canvas');
    var image = host.querySelector('img');
    if (!canvas || !image) return;
    var gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    var baseProgram;
    var blurProgram;
    var compositeProgram;
    try {
      baseProgram = program(gl, BASE);
      blurProgram = program(gl, BLUR);
      compositeProgram = program(gl, COMPOSITE);
    } catch (error) {
      console.warn('[PortraitScan] Shader setup failed; retaining static portrait.', error);
      return;
    }

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var imageTexture = gl.createTexture();
    var targets = [];
    var size = { width: 0, height: 0 };
    var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    var active = true;
    var startedAt = performance.now();
    var previous = startedAt;
    var raf = 0;

    function uploadImage() {
      gl.bindTexture(gl.TEXTURE_2D, imageTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var width = Math.max(1, Math.round(host.clientWidth * dpr));
      var height = Math.max(1, Math.round(host.clientHeight * dpr));
      if (width === size.width && height === size.height) return;
      targets.forEach(function (item) {
        gl.deleteTexture(item.texture);
        gl.deleteFramebuffer(item.fbo);
      });
      size.width = canvas.width = width;
      size.height = canvas.height = height;
      targets = [target(gl, width, height), target(gl, width, height), target(gl, width, height)];
    }

    function easeInOutQuad(t) {
      return t < 0.5 ? 2.0 * t * t : 1.0 - Math.pow(-2.0 * t + 2.0, 2.0) * 0.5;
    }

    function bindTexture(unit, texture) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    }

    function render(now) {
      if (!active) { raf = 0; return; }
      resize();
      var dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      var follow = 1.0 - Math.exp(-dt * 7.0);
      pointer.x += (pointer.tx - pointer.x) * follow;
      pointer.y += (pointer.ty - pointer.y) * follow;
      var cycle = ((now - startedAt) / 1000) % 8.0;
      var progress = Math.min(1, cycle / 3.2);
      var scan = -0.05 + 1.10 * easeInOutQuad(progress);

      gl.bindFramebuffer(gl.FRAMEBUFFER, targets[0].fbo);
      gl.viewport(0, 0, size.width, size.height);
      gl.useProgram(baseProgram);
      bindTexture(0, imageTexture);
      gl.uniform1i(gl.getUniformLocation(baseProgram, 'uImage'), 0);
      gl.uniform2f(gl.getUniformLocation(baseProgram, 'uResolution'), size.width, size.height);
      gl.uniform2f(gl.getUniformLocation(baseProgram, 'uImageSize'), image.naturalWidth, image.naturalHeight);
      gl.uniform2f(gl.getUniformLocation(baseProgram, 'uPointer'), pointer.x, pointer.y);
      gl.uniform2f(gl.getUniformLocation(baseProgram, 'uObjectPosition'), 0.5, 0.32);
      gl.uniform1f(gl.getUniformLocation(baseProgram, 'uScan'), scan);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.useProgram(blurProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, targets[1].fbo);
      bindTexture(0, targets[0].texture);
      gl.uniform1i(gl.getUniformLocation(blurProgram, 'uTexture'), 0);
      gl.uniform2f(gl.getUniformLocation(blurProgram, 'uTexel'), 1 / size.width, 1 / size.height);
      gl.uniform2f(gl.getUniformLocation(blurProgram, 'uDirection'), 1, 0);
      gl.uniform1f(gl.getUniformLocation(blurProgram, 'uThreshold'), 0.5);
      gl.uniform1i(gl.getUniformLocation(blurProgram, 'uExtract'), 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, targets[2].fbo);
      bindTexture(0, targets[1].texture);
      gl.uniform2f(gl.getUniformLocation(blurProgram, 'uDirection'), 0, 1);
      gl.uniform1i(gl.getUniformLocation(blurProgram, 'uExtract'), 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(compositeProgram);
      bindTexture(0, targets[0].texture);
      bindTexture(1, targets[2].texture);
      gl.uniform1i(gl.getUniformLocation(compositeProgram, 'uScene'), 0);
      gl.uniform1i(gl.getUniformLocation(compositeProgram, 'uBloom'), 1);
      gl.uniform1f(gl.getUniformLocation(compositeProgram, 'uBloomStrength'), 0.8);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!canvas.classList.contains('ready')) canvas.classList.add('ready');
      raf = requestAnimationFrame(render);
    }

    function boot() {
      uploadImage();
      resize();
      raf = requestAnimationFrame(render);
    }

    window.addEventListener('pointermove', function (event) {
      var rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.tx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.ty = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    }, { passive: true });

    var resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    var intersectionObserver = new IntersectionObserver(function (entries) {
      active = entries[0] ? entries[0].isIntersecting : true;
      if (active && !raf) { previous = performance.now(); raf = requestAnimationFrame(render); }
    });
    intersectionObserver.observe(host);

    if (image.complete && image.naturalWidth) boot();
    else image.addEventListener('load', boot, { once: true });
  }

  hosts.forEach(start);
})();
