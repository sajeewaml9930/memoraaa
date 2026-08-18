declare module "fluent-ffmpeg" {
  const ffmpeg: any;
  export default ffmpeg;
}

declare module "ffmpeg-static" {
  const value: string | undefined;
  export default value;
}

declare module "ffprobe-static" {
  const value: { path?: string };
  export default value;
}
