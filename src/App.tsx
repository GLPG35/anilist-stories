import { useEffect, useRef, useState } from 'react'
import styles from './styles.module.scss'
import { domToBlob, domToPng } from 'modern-screenshot'
import { PiCheckBold, PiCircleNotchBold, PiClipboardBold, PiDownloadSimpleBold } from 'react-icons/pi'

type Review = {
	id: number,
	media: {
		bannerImage: string,
		coverImage: {
			extraLarge: string
		},
		title: {
			romaji: string
		},
	},
	score: number,
	user: {
		avatar: {
			large: string
		},
		name: string
	}
}

const query = `
	query Review($reviewId: Int) {
		Review(id: $reviewId) {
			id,
			media {
				bannerImage
				coverImage {
					extraLarge
				}
				title {
					romaji
				}
			}
			user {
				avatar {
					large
				}
				name
			}
			score
		}
	}
`

const options: RequestInit = {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	}
}

const App = () => {
	const [review, setReview] = useState<Review>()
	const [id, setId] = useState<number>()
	const [loadingCopy, setLoadingCopy] = useState(false)
	const [copied, setCopied] = useState(false)
	const storyRef = useRef<HTMLDivElement>(null)
	const titleRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (id) {
			const variables = {
				reviewId: id
			}
			
			options.body = JSON.stringify({
				query,
				variables
			})

			fetch('https://graphql.anilist.co', options)
			.then(res => res.json().then(async json => {
				if (res.ok) {
					const review = json.data.Review

					const bannerImage = review.media.bannerImage ? `${import.meta.env.VITE_PROXY}/image?q=${review.media.bannerImage}` : undefined
					const coverImage = `${import.meta.env.VITE_PROXY}/image?q=${review.media.coverImage.extraLarge}`

					review.media.bannerImage = bannerImage
					review.media.coverImage.extraLarge = coverImage
					
					setReview(review)
				} else {
					Promise.reject(json)
				}
			}))
		}
	}, [id])

	useEffect(() => {
		resizeText()
	}, [review])

	const scoreColor = (score: number) => {
		if (score >= 66) return styles.green
		if (score >= 31) return styles.orange

		return styles.red
	}

	const handleChange = (e: React.FormEvent<HTMLInputElement>) => {
		const { value } = e.currentTarget

		if (!value) return

		setId(+value)
	}

	const downloadStory = () => {
		if (storyRef.current && review) {
			domToPng(storyRef.current, { scale: 3 }).then((dataURL: string) => {
				const link = document.createElement('a')
				link.download = `${review.media.title.romaji}_review_story.png`
				link.href = dataURL
				link.click()
				link.remove()
			})
		}
	}

	const copyStory = () => {
		if (storyRef.current && review) {
			setLoadingCopy(true)
			
			domToBlob(storyRef.current, { scale: 3 }).then(blob => {
				navigator.clipboard.write([
					new ClipboardItem({
						'image/png': blob
					})
				]).finally(() => {
					setLoadingCopy(false)
					setCopied(true)

					setTimeout(() => {
						setCopied(false)
					}, 2000)
				})
			})
		}
	}

	const resizeText = () => {
		if (!storyRef.current || !titleRef.current) return

		titleRef.current.style.setProperty('--font-size', '2.5em')
		
		const length = titleRef.current.innerText.length

		titleRef.current.style.setProperty('--font-size', length > 19 ? 2.5 * (length / (length + 10)) + 'em' : '2.5em')
	}
	
	return (
		<div className={styles.app}>
			<input type="text" onInput={handleChange} placeholder='Enter review ID' />
			{review &&
				<>
					<div className={styles.story} ref={storyRef}>
						<div className={styles.banner}>
							<div className={styles.gradient}></div>
							{review.media.bannerImage && <img src={review.media.bannerImage} alt="" />}
						</div>
						<div className={styles.solid}></div>
						<div className={styles.data}>
							<div className={styles.cover}>
								<img src={review.media.coverImage.extraLarge} alt="" />
								<div className={`${styles.score} ${scoreColor(review.score)}`}>
									<div className={styles.value}>
										{review.score}
										<div className={styles.total}><span>/100</span></div>
									</div>
								</div>
							</div>
							<div className={styles.info}>
								<div className={styles.title} ref={titleRef}>{review.media.title.romaji}</div>
								<div className={styles.by}>a review by {review.user.name}</div>
							</div>
						</div>
					</div>
					<div className={styles.buttons}>
						<button onClick={downloadStory}>
							<div className={styles.icon}>
								<PiDownloadSimpleBold />
							</div>
							Download
						</button>
						<button onClick={copyStory}>
							{loadingCopy ?
								<div className={styles.spinner}>
									<PiCircleNotchBold />
								</div>
							: copied ?
								<>
									<div className={styles.icon}>
										<PiCheckBold />
									</div>
									Copied!
								</>
							:
								<>
									<div className={styles.icon}>
										<PiClipboardBold />
									</div>
									Copy
								</>
							}
						</button>
					</div>
				</>
			}
		</div>
	)
}

export default App