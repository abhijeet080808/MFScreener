make: downloader.cc
	g++ -o downloader downloader.cc -std=c++11 -I /usr/local/include/boost/ -lboost_date_time

clean:
	rm -f downloader
