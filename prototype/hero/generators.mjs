// The generators on trial, as fal.ai offers them. Each entry says which pictures
// it can use, what it is sent, and what one model costs.
//
// Models, inputs and prices were read from each model's page on fal.ai on
// 18 November 2026. Prices change: check the page before a paid run.
//
// Every generator runs as its service ships it, with textures on. The one
// exception is Tripo's detailed textures, because decals are what is judged.

/**
 * The views a capture can hold. Mini GT's own product pictures give the first
 * three; the collector's own photographs give the square-on ones.
 */
export const VIEWS = ['front-left', 'rear-right', 'left', 'right', 'front', 'back', 'top'];

const has = (views, ...names) => names.every((n) => views[n]);
const pick = (views, names) => names.filter((n) => views[n]).map((n) => views[n]);

export const GENERATORS = [
  {
    id: 'meshy',
    label: 'Meshy 7.1',
    page: 'https://fal.ai/models/meshy/v7.1/multi-image-to-3d',
    note: 'Takes one to four views from any angle.',
    plan(views) {
      // the two corner views first: between them they show every side
      const order = ['front-left', 'rear-right', 'left', 'right', 'front', 'back', 'top'];
      const used = order.filter((n) => views[n]).slice(0, 4);
      if (!used.length) return null;
      return {
        // fal's catalogue lists Meshy without the fal-ai/ prefix; the prefixed name is unlisted
        model: 'meshy/v7.1/multi-image-to-3d',
        used,
        price: 1.2, // $0.80 for the shape, $0.40 more for textures
        input: { image_urls: pick(views, used), should_texture: true },
      };
    },
    glb: (data) => data?.model_glb?.url ?? data?.model_urls?.glb?.url,
  },
  {
    id: 'rodin',
    label: 'Rodin 2.5',
    page: 'https://fal.ai/models/fal-ai/hyper3d/rodin/v2.5',
    note: 'Takes up to five views of one object, in any order.',
    plan(views) {
      const order = ['front-left', 'rear-right', 'left', 'right', 'top', 'front', 'back'];
      const used = order.filter((n) => views[n]).slice(0, 5);
      if (!used.length) return null;
      return {
        // Rodin 2.5 replaced Rodin 2 for this trial on 18 November 2026, at the same price
        model: 'fal-ai/hyper3d/rodin/v2.5',
        used,
        price: 0.4, // HighPack would add $0.80; it is not used
        input: { image_urls: pick(views, used), geometry_file_format: 'glb', material: 'PBR' },
      };
    },
    glb: (data) => data?.model_mesh?.url,
  },
  {
    id: 'hunyuan',
    label: 'Hunyuan3D 3.1 Pro',
    page: 'https://fal.ai/models/fal-ai/hunyuan-3d/v3.1/pro/image-to-3d',
    note: 'Wants a square-on front view to anchor its other views. Without one it runs from a single picture.',
    plan(views) {
      const model = 'fal-ai/hunyuan-3d/v3.1/pro/image-to-3d';
      if (has(views, 'front')) {
        // its named slots match the collector's own six photographs
        const slots = { back: 'back_image_url', left: 'left_image_url', right: 'right_image_url', top: 'top_image_url', 'front-left': 'left_front_image_url' };
        const extra = Object.keys(slots).filter((n) => views[n]);
        const input = { input_image_url: views.front, generate_type: 'Normal' };
        for (const n of extra) input[slots[n]] = views[n];
        return { model, used: ['front', ...extra], price: extra.length ? 0.525 : 0.375, input }; // several views add $0.15
      }
      if (!has(views, 'front-left')) return null;
      return { model, used: ['front-left'], price: 0.375, input: { input_image_url: views['front-left'], generate_type: 'Normal' } };
    },
    glb: (data) => data?.model_glb?.url ?? data?.model_urls?.glb?.url,
  },
  {
    id: 'tripo',
    label: 'Tripo H3.1',
    page: 'https://fal.ai/models/tripo3d/h3.1/image-to-3d',
    note: 'Its several-view mode needs front, left, back and right square-on. Without them it runs from a single picture.',
    plan(views) {
      const common = { texture: true, pbr: true, texture_quality: 'detailed', texture_alignment: 'original_image' };
      if (has(views, 'front', 'left', 'back', 'right')) {
        return {
          model: 'tripo3d/h3.1/multiview-to-3d',
          used: ['front', 'left', 'back', 'right'],
          price: 0.4, // with detailed textures
          input: { image_urls: pick(views, ['front', 'left', 'back', 'right']), ...common },
        };
      }
      if (!has(views, 'front-left')) return null;
      return { model: 'tripo3d/h3.1/image-to-3d', used: ['front-left'], price: 0.4, input: { image_url: views['front-left'], ...common } };
    },
    glb: (data) => data?.model_mesh?.url ?? data?.model_urls?.glb?.url,
  },
];

export const generator = (id) => GENERATORS.find((g) => g.id === id);
