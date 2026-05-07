import createImageUrlBuilder from '@sanity/image-url'
import { getSanityClient } from './client'

let _imageBuilder: ReturnType<typeof createImageUrlBuilder> | null = null

function getImageBuilder() {
  if (!_imageBuilder) {
    _imageBuilder = createImageUrlBuilder(getSanityClient())
  }
  return _imageBuilder
}

export function urlForImage(source: Parameters<ReturnType<typeof createImageUrlBuilder>['image']>[0]) {
  return getImageBuilder().image(source)
}
