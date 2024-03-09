'use server'
import fs from 'fs/promises'
import { Canvas as NapiCanvas, Image, loadImage } from '@napi-rs/canvas'
import { base } from '@/consts'
import { Config } from './types'
import { getIconDimensions, getIconPosition } from './format-icon'
import { FolderImage, Resolution, Size, resolutions } from './consts'
import { drawFolderArt, drawIcon, getFolderPath, getIconPath } from './common'

async function loadIconImg(icon: string | File): Promise<Image> {
   const isDefaultIcon = typeof icon === 'string'

   if (isDefaultIcon) {
      return await loadImage(getIconPath(icon))
   } else {
      const data = await icon.arrayBuffer()
      return await loadImage(data)
   }
}

async function createIcon(
   iconImg: Image,
   width: number,
   height: number,
   config: Config
): Promise<Image> {
   const canvas = new NapiCanvas(width, height)
   const ctx = canvas.getContext('2d')
   drawIcon(canvas, ctx, iconImg, width, height, config)
   const iconData = canvas.toBuffer('image/png')
   return await loadImage(iconData)
}

async function createPreview(
   folder: Image,
   icon: Image,
   x: number,
   y: number,
   width: number,
   height: number,
   resolution: Resolution
) {
   const size = Size[resolution]
   const canvas = new NapiCanvas(size, size)
   const ctx = canvas.getContext('2d')
   drawFolderArt(ctx, folder, icon, x, y, width, height, resolution)
   return canvas.toBuffer('image/png')
}

export async function downloadFolderArt(formData: FormData, config: Omit<Config, 'icon'>) {
   const file = formData.get('file')

   if (!file) {
      throw new Error("Couldn't get file")
   }

   const iconImg = await loadIconImg(file)
   const id = (Math.random() + 1).toString(36).substring(7)
   const dir = `${base}/results/${id}`
   await fs.mkdir(dir, { recursive: true })

   for (const resolution of resolutions) {
      const { width, height } = getIconDimensions(iconImg.width, iconImg.height, resolution)
      const { x, y } = getIconPosition(width, height, resolution)
      const icon = await createIcon(iconImg, width, height, config)
      const folder = await loadImage(getFolderPath(resolution, config.theme))

      const result = await createPreview(folder, icon, x, y, width, height, resolution)
      await fs.writeFile(`${dir}/${FolderImage[resolution]}.png`, result)
   }

   await fs.rename(dir, `${dir}.iconset`)
}
