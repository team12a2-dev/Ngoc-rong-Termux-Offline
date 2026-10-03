using System;
using System.Collections.Generic;
using Game2.Assets.src.e;

namespace Game2
{
	public class SmallImage
	{
		public static int[][] smallImg;

		public static SmallImage instance;

		public static Image[] imgbig;

		public static Small[] imgNew;

		public static MyVector vKeys = new MyVector();

		public static Image imgEmpty = null;

		public static sbyte[] newSmallVersion;

		public static int smallCount;

		public static short maxSmall;

		public static Dictionary<int, Image> imageRaw = new Dictionary<int, Image>();

		public SmallImage()
		{
			readImage();
		}

		public static void loadBigRMS()
		{
			if (imgbig == null)
			{
				imgbig = new Image[5]
				{
					GameCanvas.loadImageRMS("/img/Big0.png"),
					GameCanvas.loadImageRMS("/img/Big1.png"),
					GameCanvas.loadImageRMS("/img/Big2.png"),
					GameCanvas.loadImageRMS("/img/Big3.png"),
					GameCanvas.loadImageRMS("/img/Big4.png")
				};
			}
		}

		public static void loadBigImage()
		{
			imgEmpty = Image.createRGBImage(new int[1], 1, 1, bl: true);
		}

		public static void init()
		{
			instance = null;
			instance = new SmallImage();
		}

		public void readImage()
		{
			int num = 0;
			try
			{
				DataInputStream dataInputStream = new DataInputStream(Rms.loadRMS("NR_image"));
				short num2 = dataInputStream.readShort();
				smallImg = new int[num2][];
				for (int i = 0; i < smallImg.Length; i++)
				{
					smallImg[i] = new int[5];
				}
				for (int j = 0; j < num2; j++)
				{
					num++;
					smallImg[j][0] = dataInputStream.readUnsignedByte();
					smallImg[j][1] = dataInputStream.readShort();
					smallImg[j][2] = dataInputStream.readShort();
					smallImg[j][3] = dataInputStream.readShort();
					smallImg[j][4] = dataInputStream.readShort();
				}
			}
			catch (Exception ex)
			{
				Cout.LogError3("Loi readImage: " + ex.ToString() + "i= " + num);
			}
		}

		public static void clearHastable()
		{
		}

		private static void EnsureCapacity(int id)
		{
			if (imgNew == null)
			{
				int initialSize = (id + 1000 > 20000) ? (id + 1000) : 20000;
				imgNew = new Small[initialSize];
				return;
			}
			if (id >= imgNew.Length)
			{
				int newSize = (id + 1000 > imgNew.Length * 2) ? (id + 1000) : (imgNew.Length * 2);
				Array.Resize(ref imgNew, newSize);
			}
		}

		public static void createImage(int id)
		{
			if (id < 0)
			{
				return;
			}
			EnsureCapacity(id);
			if (mGraphics.zoomLevel == 1)
			{
				Image image = GameCanvas.loadImage("/SmallImage/Small" + id + ".png");
				if (image != null)
				{
					imgNew[id] = new Small(image, id);
					return;
				}
				imgNew[id] = new Small(imgEmpty, id);
				Service.gI().requestIcon(id);
				return;
			}
			Image image2 = GameCanvas.loadImage("/SmallImage/Small" + id + ".png");
			if (image2 != null)
			{
				imgNew[id] = new Small(image2, id);
				return;
			}
			bool flag = false;
			if (imageRaw.ContainsKey(id))
			{
				Image value = null;
				imageRaw.TryGetValue(id, out value);
				if (value != null)
				{
					imgNew[id] = new Small(value, id);
				}
				else
				{
					flag = true;
				}
			}
			else
			{
				flag = true;
			}
			if (flag)
			{
				imgNew[id] = new Small(imgEmpty, id);
				Service.gI().requestIcon(id);
			}
		}

		public static void drawSmallImage(mGraphics g, int id, int x, int y, int transform, int anchor)
		{
			if (id < 0)
			{
				return;
			}
			EnsureCapacity(id);
			if (imgbig != null)
			{
				if (smallImg != null && id < smallImg.Length && smallImg[id] != null)
				{
					if (smallImg[id][1] >= 256 || smallImg[id][3] >= 256 || smallImg[id][2] >= 256 || smallImg[id][4] >= 256)
					{
						Small small = (id < imgNew.Length) ? imgNew[id] : null;
						if (small == null)
						{
							createImage(id);
						}
						else
						{
							small.paint(g, transform, x, y, anchor);
						}
					}
					else if (smallImg[id][0] < imgbig.Length && imgbig[smallImg[id][0]] != null)
					{
						g.drawRegion(imgbig[smallImg[id][0]], smallImg[id][1], smallImg[id][2], smallImg[id][3], smallImg[id][4], transform, x, y, anchor);
					}
				}
				else
				{
					Small small2 = (id < imgNew.Length) ? imgNew[id] : null;
					if (small2 == null)
					{
						createImage(id);
					}
					else
					{
						small2.paint(g, transform, x, y, anchor);
					}
				}
			}
			else
			{
				Small small3 = (id < imgNew.Length) ? imgNew[id] : null;
				if (small3 == null)
				{
					createImage(id);
				}
				else
				{
					g.drawRegion(small3, 0, 0, mGraphics.getImageWidth(small3.img), mGraphics.getImageHeight(small3.img), transform, x, y, anchor);
				}
			}
		}

		public static void drawSmallImage(mGraphics g, int id, int f, int x, int y, int w, int h, int transform, int anchor)
		{
			if (id < 0)
			{
				return;
			}
			EnsureCapacity(id);
			if (imgbig == null)
			{
				Small small = (id < imgNew.Length) ? imgNew[id] : null;
				if (small == null)
				{
					createImage(id);
				}
				else
				{
					g.drawRegion(small.img, 0, f * h, w, h, transform, x, y, anchor);
				}
			}
			else if (smallImg == null || id >= smallImg.Length || smallImg[id] == null)
			{
				Small small2 = (id < imgNew.Length) ? imgNew[id] : null;
				if (small2 == null)
				{
					createImage(id);
				}
				else
				{
					small2.paint(g, transform, f, x, y, w, h, anchor);
				}
			}
			else if (smallImg[id][1] >= 256 || smallImg[id][3] >= 256 || smallImg[id][2] >= 256 || smallImg[id][4] >= 256)
			{
				Small small3 = (id < imgNew.Length) ? imgNew[id] : null;
				if (small3 == null)
				{
					createImage(id);
				}
				else
				{
					small3.paint(g, transform, f, x, y, w, h, anchor);
				}
			}
			else if (smallImg[id][0] != 4 && smallImg[id][0] < imgbig.Length && imgbig[smallImg[id][0]] != null)
			{
				g.drawRegion(imgbig[smallImg[id][0]], 0, f * h, w, h, transform, x, y, anchor);
			}
			else
			{
				Small small4 = (id < imgNew.Length) ? imgNew[id] : null;
				if (small4 == null)
				{
					createImage(id);
				}
				else
				{
					small4.paint(g, transform, f, x, y, w, h, anchor);
				}
			}
		}

		public static void update()
		{
			int num = 0;
			if (GameCanvas.gameTick % 1000 != 0)
			{
				return;
			}
			for (int i = 0; i < imgNew.Length; i++)
			{
				if (imgNew[i] != null)
				{
					num++;
					imgNew[i].update();
					smallCount++;
				}
			}
			if (num > 200 && GameCanvas.lowGraphic)
			{
				imgNew = new Small[maxSmall];
			}
		}
	}
}
