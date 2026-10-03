using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

class Program
{
    static void Main()
    {
        string dir = "Assets/Resources/res/x4/mainimage";
        Bitmap panel = (Bitmap)Image.FromFile(dir + "/myTexture2dpanel.png");
        Bitmap hp = (Bitmap)Image.FromFile(dir + "/myTexture2dHP.png");
        Bitmap mp = (Bitmap)Image.FromFile(dir + "/myTexture2dMP.png");

        Bitmap full = new Bitmap(panel.Width, panel.Height, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(full))
        {
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.DrawImage(panel, 0, 0);
            g.DrawImage(hp, 308, 24);
            g.DrawImage(mp, 308, 76);

            // Light Sweep Shine on HP Bar
            using (GraphicsPath sp = new GraphicsPath())
            {
                sp.AddRectangle(new RectangleF(420, 24, 40, 40));
                using (LinearGradientBrush sgb = new LinearGradientBrush(new PointF(420, 0), new PointF(460, 0),
                    Color.FromArgb(0, 255, 255, 255), Color.FromArgb(160, 255, 255, 255)))
                {
                    g.FillPath(sgb, sp);
                }
            }

            // Falling Sakura Petal Particles
            using (SolidBrush pb = new SolidBrush(Color.FromArgb(200, 255, 170, 190)))
            {
                g.FillEllipse(pb, 120, 40, 8, 8);
                g.FillEllipse(pb, 210, 85, 10, 10);
                g.FillEllipse(pb, 280, 50, 7, 7);
                g.FillEllipse(pb, 360, 130, 9, 9);
            }

            // Star Sparkle
            using (Pen sp = new Pen(Color.FromArgb(240, 255, 255, 255), 2f))
            {
                g.DrawLine(sp, 136, 128, 136, 144);
                g.DrawLine(sp, 128, 136, 144, 136);
            }

            StringFormat sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
            
            // Left: Map Name & Zone
            using (GraphicsPath p = new GraphicsPath())
            {
                p.AddString("Lợn Lòi", FontFamily.GenericSansSerif, (int)FontStyle.Bold, 25, new PointF(156, 52), sf);
                g.DrawPath(new Pen(Color.FromArgb(50, 20, 10), 6), p);
                g.FillPath(new SolidBrush(Color.FromArgb(255, 255, 220, 80)), p);
            }
            using (GraphicsPath p = new GraphicsPath())
            {
                p.AddString("1.437.526 • K1", FontFamily.GenericSansSerif, (int)FontStyle.Bold, 22, new PointF(156, 104), sf);
                g.DrawPath(new Pen(Color.FromArgb(50, 20, 10), 6), p);
                g.FillPath(Brushes.White, p);
            }

            // HP / MP Numbers
            using (GraphicsPath p = new GraphicsPath())
            {
                p.AddString("1.437.526", FontFamily.GenericSansSerif, (int)FontStyle.Bold, 24, new PointF(468, 44), sf);
                g.DrawPath(new Pen(Color.FromArgb(60, 10, 15), 6), p);
                g.FillPath(Brushes.White, p);
            }
            using (GraphicsPath p = new GraphicsPath())
            {
                p.AddString("159.312.553", FontFamily.GenericSansSerif, (int)FontStyle.Bold, 24, new PointF(468, 96), sf);
                g.DrawPath(new Pen(Color.FromArgb(10, 25, 60), 6), p);
                g.FillPath(Brushes.White, p);
            }
        }

        full.Save("C:/Users/bimat/.gemini/antigravity-ide/brain/2fcdb911-68f3-4df5-af3a-923453e9408c/hud_with_effects.png", ImageFormat.Png);
        panel.Dispose();
        hp.Dispose();
        mp.Dispose();
        full.Dispose();
    }
}
