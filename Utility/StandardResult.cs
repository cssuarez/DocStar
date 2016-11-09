using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;
using System.Web.Mvc;
using Astria.Framework.DataContracts;

namespace Astria.UI.Web.Utility
{
    /// <summary>
    /// jsonResult
    /// </summary>
    public static class StandardResult
    {
        public static byte[] CreateBitmapImage(string imageText)
        {
            Bitmap bmpImage = new Bitmap(1, 1);

            int width = 0;
            int height = 0;

            // Create the Font object for the image text drawing.
            Font font = new Font("Arial", 20, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Pixel);

            // Create a graphics object to measure the text's width and height.
            Graphics graphics = Graphics.FromImage(bmpImage);

            // This is where the bitmap size is determined.
            var textSize = graphics.MeasureString(imageText, font);
            width = (int)textSize.Width;
            height = (int)textSize.Height;

            // Create the bmpImage again with the correct size for the text and font.
            bmpImage = new Bitmap(bmpImage, new Size(width, height));

            // Add the colors to the new bitmap.
            graphics = Graphics.FromImage(bmpImage);

            // Set Background color
            graphics.Clear(Color.White);
            graphics.SmoothingMode = SmoothingMode.AntiAlias;
            graphics.TextRenderingHint = TextRenderingHint.AntiAlias;
            graphics.DrawString(imageText, font, new SolidBrush(Color.FromArgb(102, 102, 102)), 0, 0);
            graphics.Flush();

            byte[] bytes = null;
            using (MemoryStream ms = new MemoryStream())
            {
                bmpImage.Save(ms, ImageFormat.Png);
                bytes = ms.ToArray();
            }

            return bytes;
        }
    }
}